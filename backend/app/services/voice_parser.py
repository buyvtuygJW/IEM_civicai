"""Converts a raw voice transcript (captured client-side via the Web Speech API,
in English or Hindi) into a structured complaint draft: category, department,
priority, a clean English description, and an area name if mentioned.

This lets a citizen just say something like:
  "Mere area mein street light kharab hai, Sector 12 Rohini mein"
and get back a structured, ready-to-submit complaint.
"""
import re
from typing import Dict
from . import ai_client, classifier, place_resolver

HINGLISH_TRANSLATIONS = {
    "kharab hai": "is not working",
    "kharab": "broken",
    "nahi aa raha": "is not coming",
    "nahi aa rha": "is not coming",
    "nahi hai": "is not available",
    "bahut": "very",
    "area": "area",
    "mein": "in",
    "safai": "cleanliness",
    "gaddha": "pothole",
    "sadak": "road",
    "paani": "water",
    "bijli": "electricity",
    "naali": "drain",
    "kachra": "garbage",
}


def _rough_translate(text: str) -> str:
    """Extremely lightweight Hinglish -> English gloss, used only as an offline
    fallback so the demo still shows a readable English case file without an API key."""
    lowered = text
    for hi, en in HINGLISH_TRANSLATIONS.items():
        lowered = re.sub(hi, en, lowered, flags=re.IGNORECASE)
    return lowered


def _extract_area(text: str) -> str:
    """Looks at each comma/period-separated clause, starting from the end of the
    sentence, for a clause that ends in a locative postposition ('mein', 'me',
    'in', 'near', 'at') — this is where an area/locality name is usually spoken,
    e.g. '..., Sector 12 Rohini mein'."""
    clauses = re.split(r"[,.]", text)
    for clause in reversed(clauses):
        clause = clause.strip()
        match = re.match(r"^(.*?)\s+(?:mein|me|in|near|at)$", clause, flags=re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            if len(candidate) > 2 and candidate.lower() not in ("area", "my", "the", "mere area"):
                return candidate.title()
    return ""


def _enrich_area(result: Dict, transcript: str) -> Dict:
    """Run the extracted area through the shared gazetteer so both the AI and
    the rule-based paths produce the SAME canonical "City, State" locality.

    If an area was extracted, resolve it; otherwise try to find a place named
    anywhere in the transcript. A non-empty but unrecognised area is kept as-is
    (a real-but-obscure locality shouldn't disappear just because it isn't in
    the gazetteer)."""
    raw_area = (result.get("area") or "").strip()
    resolved = place_resolver.resolve(raw_area) if raw_area else place_resolver.extract_from_text(transcript)
    if resolved:
        result["area"] = resolved["display"]
        result["state"] = resolved["state"]
        result["area_confidence"] = resolved["confidence"]
    else:
        result["area"] = raw_area
        result.setdefault("state", None)
        result.setdefault("area_confidence", None)
    return result


def parse_voice_complaint(transcript: str, language: str = "en") -> Dict:
    ai_result = ai_client.ask_json(
        system_prompt=(
            "You convert a citizen's spoken civic complaint (English, Hindi, or Hinglish, "
            "transcribed from speech so it may be informal or slightly garbled) into a "
            "structured JSON object for a municipal complaint system. Respond with ONLY JSON: "
            "{ \"description_en\": clean one-sentence English description, "
            "\"category\": one of [streetlight, water_supply, drainage, garbage, road_pothole, "
            "electricity, illegal_construction, stray_animals, noise_pollution, traffic, general], "
            "\"department\": responsible Indian civic authority, "
            "\"priority\": one of [low, medium, high, critical], "
            "\"area\": the locality/area name mentioned, or empty string if none mentioned }"
        ),
        user_prompt=transcript,
    )
    if ai_result and "description_en" in ai_result:
        ai_result.setdefault("area", "")
        return _enrich_area(ai_result, transcript)

    # Offline fallback
    classified = classifier.classify_complaint(transcript)
    return _enrich_area({
        "description_en": _rough_translate(transcript),
        "category": classified["category"],
        "department": classified["department"],
        "priority": classified["priority"],
        "area": _extract_area(transcript),
    }, transcript)
