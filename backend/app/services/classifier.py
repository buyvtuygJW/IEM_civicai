"""Classifies a free-text civic complaint into a category, assigns the
responsible authority/department, and estimates a priority level.

Works fully offline via keyword rules; upgrades to Claude automatically when
ANTHROPIC_API_KEY is configured for higher accuracy on messy/ambiguous text —
which matters a lot here, since the keyword lists below cover only the most
common word for each issue in each language and won't catch every phrasing.
"""
from typing import Dict
from . import ai_client

CATEGORY_RULES = [
    ("streetlight", [
        "street light", "streetlight", "lamp post", "lamppost", "light not working",
        "batti", "bijli ka khambha", "roshni",          # Hindi/Hinglish
        "আলো", "রাস্তার বাতি",                              # Bengali
        "விளக்கு", "தெரு விளக்கு",                          # Tamil
        "దీపం", "వీధి దీపం",                                # Telugu
        "दिवा",                                            # Marathi
        "દીવો",                                            # Gujarati
        "ದೀಪ", "ಬೀದಿ ದೀಪ",                                  # Kannada
        "വിളക്ക്", "തെരുവ് വിളക്ക്",                          # Malayalam
        "ਲਾਈਟ",                                            # Punjabi
    ], "Electricity Department"),
    ("water_supply", [
        "no water", "water supply", "water shortage", "pipeline leak", "water leak",
        "paani", "pani nahi", "jal",                     # Hindi/Hinglish
        "পানি", "জল",                                      # Bengali
        "தண்ணீர்",                                          # Tamil
        "నీళ్ళు", "నీరు",                                   # Telugu
        "पाणी",                                            # Marathi
        "પાણી",                                            # Gujarati
        "ನೀರು",                                            # Kannada
        "വെള്ളം",                                          # Malayalam
        "ਪਾਣੀ",                                            # Punjabi
    ], "Water Board"),
    ("drainage", [
        "drain", "drainage", "sewage", "sewer", "overflow", "naali", "gutter",
        "নর্দমা",                                          # Bengali
        "வடிகால்",                                          # Tamil
        "కాలువ",                                           # Telugu
        "गटार",                                            # Marathi
        "ગટર",                                             # Gujarati
        "ಚರಂಡಿ",                                           # Kannada
        "ഓട",                                              # Malayalam
        "ਨਾਲੀ",                                            # Punjabi
    ], "Sanitation Department"),
    ("garbage", [
        "garbage", "trash", "waste", "dump", "kachra", "safai", "cleanliness",
        "আবর্জনা",                                         # Bengali
        "குப்பை",                                          # Tamil
        "చెత్త",                                           # Telugu
        "कचरा",                                            # Marathi
        "કચરો",                                            # Gujarati
        "ಕಸ",                                              # Kannada
        "മാലിന്യം",                                        # Malayalam
        "ਕੂੜਾ",                                            # Punjabi
    ], "Municipal Sanitation Department"),
    ("road_pothole", [
        "pothole", "road damage", "broken road", "road crack", "gaddha", "sadak",
        "রাস্তা", "গর্ত",                                    # Bengali
        "சாலை", "பள்ளம்",                                   # Tamil
        "రోడ్డు", "గుంత",                                   # Telugu
        "रस्ता", "खड्डा",                                    # Marathi
        "રસ્તો", "ખાડો",                                    # Gujarati
        "ರಸ್ತೆ", "ಗುಂಡಿ",                                    # Kannada
        "റോഡ്", "കുഴി",                                     # Malayalam
        "ਸੜਕ", "ਟੋਆ",                                       # Punjabi
    ], "Public Works Department (PWD)"),
    ("electricity", [
        "power cut", "electricity", "transformer", "wire hanging", "short circuit", "bijli",
        "বিদ্যুৎ",                                          # Bengali
        "மின்சாரம்",                                        # Tamil
        "విద్యుత్",                                         # Telugu
        "वीज",                                             # Marathi
        "વીજળી",                                           # Gujarati
        "ವಿದ್ಯುತ್",                                         # Kannada
        "വൈദ്യുതി",                                        # Malayalam
        "ਬਿਜਲੀ",                                           # Punjabi
    ], "Electricity Department"),
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
            "Citizens may write in English or any major Indian language — Hindi, Bengali, Tamil, "
            "Telugu, Marathi, Gujarati, Kannada, Malayalam, or Punjabi — in native script or "
            "Latin transliteration (Hinglish-style). Respond with ONLY a JSON object with keys: "
            "category (one of: streetlight, water_supply, drainage, garbage, road_pothole, "
            "electricity, illegal_construction, stray_animals, noise_pollution, traffic, general), "
            "department (the Indian civic authority responsible), priority (one of: low, medium, "
            "high, critical), and description_en (a clean one-sentence English translation/summary "
            "of the complaint suitable for a case file). No markdown, no prose."
        ),
        user_prompt=text,
    )
    if ai_result and all(k in ai_result for k in ("category", "department", "priority")):
        return ai_result

    fallback = _rule_based_classify(text)
    fallback["description_en"] = text
    return fallback
