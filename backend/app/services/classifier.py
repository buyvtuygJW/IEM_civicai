"""Classifies a free-text civic complaint into a category, assigns the
responsible authority/department, and estimates a priority level.

Works fully offline via keyword rules; upgrades to Claude automatically when
ANTHROPIC_API_KEY is configured for higher accuracy on messy/ambiguous text.
"""
from typing import Dict
from . import ai_client

CATEGORY_RULES = [
    ("streetlight", ["street light", "streetlight", "lamp post", "lamppost", "light not working",
                      "batti", "bijli ka khambha", "roshni"], "Electricity Department"),
    ("water_supply", ["no water", "water supply", "water shortage", "pipeline leak", "water leak",
                       "paani", "pani nahi", "jal"], "Water Board"),
    ("drainage", ["drain", "drainage", "sewage", "sewer", "overflow", "naali", "gutter"],
     "Sanitation Department"),
    ("garbage", ["garbage", "trash", "waste", "dump", "kachra", "safai", "cleanliness"],
     "Municipal Sanitation Department"),
    ("road_pothole", ["pothole", "road damage", "broken road", "road crack", "gaddha", "sadak"],
     "Public Works Department (PWD)"),
    ("electricity", ["power cut", "electricity", "transformer", "wire hanging", "short circuit",
                      "bijli"], "Electricity Department"),
    ("illegal_construction", ["illegal construction", "encroachment", "unauthorized building"],
     "Town Planning Department"),
    ("stray_animals", ["stray dog", "stray cattle", "stray animal", "monkey menace", "awara"],
     "Animal Control Department"),
    ("noise_pollution", ["noise", "loudspeaker", "loud music", "shor"], "Pollution Control Board"),
    ("traffic", ["traffic signal", "traffic jam", "signal not working", "parking"],
     "Traffic Police Department"),
]

URGENT_KEYWORDS = ["accident", "fire", "collapse", "electrocution", "live wire", "gas leak",
                    "danger", "injured", "child", "flooding", "flood"]


def _rule_based_classify(text: str) -> Dict:
    lowered = text.lower()

    category, department = "general", "General Municipal Office"
    for cat, keywords, dept in CATEGORY_RULES:
        if any(k in lowered for k in keywords):
            category, department = cat, dept
            break

    priority = "medium"
    if any(k in lowered for k in URGENT_KEYWORDS):
        priority = "critical"
    elif category in ("road_pothole", "drainage", "electricity"):
        priority = "high"
    elif category in ("noise_pollution", "stray_animals"):
        priority = "low"

    return {"category": category, "department": department, "priority": priority}


def classify_complaint(text: str) -> Dict:
    ai_result = ai_client.ask_json(
        system_prompt=(
            "You are a civic complaint triage system for an Indian municipal corporation. "
            "Given a citizen's complaint (which may be in English, Hindi, or Hinglish), respond "
            "with ONLY a JSON object with keys: category (one of: streetlight, water_supply, "
            "drainage, garbage, road_pothole, electricity, illegal_construction, stray_animals, "
            "noise_pollution, traffic, general), department (the Indian civic authority responsible), "
            "priority (one of: low, medium, high, critical), and description_en (a clean one-sentence "
            "English translation/summary of the complaint suitable for a case file). No markdown, no prose."
        ),
        user_prompt=text,
    )
    if ai_result and all(k in ai_result for k in ("category", "department", "priority")):
        return ai_result

    fallback = _rule_based_classify(text)
    fallback["description_en"] = text
    return fallback
