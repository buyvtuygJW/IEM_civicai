from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..services import eligibility_engine, ai_client, place_resolver

router = APIRouter(prefix="/api/welfare", tags=["welfare"])


@router.get("/schemes")
def list_schemes():
    return eligibility_engine.all_schemes()


@router.get("/states")
def list_states():
    """All 28 states + 8 union territories, for a profile dropdown. Each entry
    is {code, name, capital, type} where type is 'state' or 'ut'."""
    return place_resolver.list_states()


@router.post("/eligibility", response_model=schemas.EligibilityResponse)
def check_eligibility(profile: schemas.CitizenProfile, db: Session = Depends(get_db)):
    # Canonicalize the state once ("orissa"/"WB"/"dilli" -> official name) so
    # eligibility checks and dashboard analytics both group consistently.
    profile_data = profile.model_dump()
    profile_data["state"] = place_resolver.normalize_state(profile_data.get("state"))

    result = eligibility_engine.evaluate_schemes(profile_data)

    # log for the dashboard's "scheme adoption / interest" analytics
    for scheme in result["eligible"]:
        db.add(models.EligibilityCheck(
            scheme_id=scheme["id"], scheme_name=scheme["name"],
            matched=True, state=profile_data["state"],
        ))
    for scheme in result["almost_eligible"]:
        db.add(models.EligibilityCheck(
            scheme_id=scheme["id"], scheme_name=scheme["name"],
            matched=False, state=profile_data["state"],
        ))
    db.commit()

    return result


@router.post("/chat")
def welfare_chat(payload: schemas.ChatMessage):
    """Free-form Q&A for the Welfare Copilot, e.g. 'What documents do I need for
    PM-KISAN?' Falls back to a helpful canned response if no API key is set."""
    context = ""
    if payload.profile:
        context = f"Citizen profile so far: {payload.profile.model_dump()}\n"

    schemes_summary = "\n".join(
        f"- {s['name']} ({s['category']}): {s['description']} Benefit: {s['benefit']}"
        for s in eligibility_engine.all_schemes()
    )

    answer = ai_client.ask_text(
        system_prompt=(
            "You are Welfare Copilot, a friendly assistant helping Indian citizens understand "
            "which government welfare schemes they may be eligible for and what documents they "
            "need. Use only the scheme list provided below; do not invent schemes. Keep answers "
            "short, warm, and actionable, and use plain language a first-time applicant would "
            "understand.\n\nAvailable schemes:\n" + schemes_summary
        ),
        user_prompt=context + payload.message,
    )

    if answer is None:
        answer = (
            "I can help you check eligibility for schemes like PM-KISAN, Ayushman Bharat, "
            "PMAY, and more. Try filling in your profile (age, income, occupation, state) "
            "and I'll show you exactly what you qualify for and which documents to prepare. "
            "(Set an ANTHROPIC_API_KEY, OPENAI_API_KEY, or free GEMINI_API_KEY for free-form Q&A.)"
        )

    return {"answer": answer}
