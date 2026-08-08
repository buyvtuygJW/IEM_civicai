from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..services import eligibility_engine, ai_client
from ..services.auth import require_role

router = APIRouter(prefix="/api/welfare", tags=["welfare"])


@router.get("/schemes")
def list_schemes():
    return eligibility_engine.all_schemes()


@router.post("/eligibility", response_model=schemas.EligibilityResponse)
def check_eligibility(profile: schemas.CitizenProfile, db: Session = Depends(get_db)):
    result = eligibility_engine.evaluate_schemes(profile.model_dump())

    # log for the dashboard's "scheme adoption / interest" analytics
    for scheme in result["eligible"]:
        db.add(models.EligibilityCheck(
            scheme_id=scheme["id"], scheme_name=scheme["name"],
            matched=True, state=profile.state,
        ))
    for scheme in result["almost_eligible"]:
        db.add(models.EligibilityCheck(
            scheme_id=scheme["id"], scheme_name=scheme["name"],
            matched=False, state=profile.state,
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
            "(Connect an ANTHROPIC_API_KEY for free-form Q&A.)"
        )

    return {"answer": answer}


@router.get("/admin/overview")
def welfare_admin_overview(
    db: Session = Depends(get_db),
    _gov: models.User = Depends(require_role("government")),
):
    """Government-only welfare analytics — kept separate from the complaint
    dashboard so each console page has a single, focused job."""
    checks = db.query(models.EligibilityCheck).all()
    scheme_counter = Counter(c.scheme_name for c in checks if c.matched)
    state_counter = Counter(c.state for c in checks if c.state)

    schemes_with_stats = [
        {
            "id": s["id"],
            "name": s["name"],
            "category": s["category"],
            "benefit": s["benefit"],
            "interested_citizens": scheme_counter.get(s["name"], 0),
        }
        for s in eligibility_engine.all_schemes()
    ]
    schemes_with_stats.sort(key=lambda s: -s["interested_citizens"])

    return {
        "total_eligibility_checks": len(checks),
        "scheme_adoption": [
            {"scheme": name, "interested_citizens": count}
            for name, count in scheme_counter.most_common(8)
        ],
        "state_breakdown": [
            {"state": state, "count": count}
            for state, count in state_counter.most_common(8)
        ],
        "schemes": schemes_with_stats,
    }
