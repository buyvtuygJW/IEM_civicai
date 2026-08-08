"""Rule-based eligibility engine.

Each scheme in schemes.json declares a `criteria` dict. Supported criteria keys:

  min_age / max_age            -> profile.age
  gender_in                    -> profile.gender must be in list
  occupation_in                -> profile.occupation must be in list (case-insensitive substring match)
  max_income                   -> profile.annual_income must be <= value
  owns_land (bool)              -> profile.owns_land must equal value
  owns_pucca_house (bool)       -> profile.owns_pucca_house must equal value
  has_girl_child_under_10 (bool)
  bpl_or_seci_listed (bool)
  has_disability (bool)
  category_in                  -> profile.category must be in list (General/OBC/SC/ST)
  currently_studying (bool)
  is_pregnant_or_lactating (bool)
  has_bank_account (bool)

A scheme is "eligible" if ALL criteria are satisfied.
A scheme is "almost_eligible" if at most one criterion fails (useful nudge, e.g.
"you'd qualify if your income was a little lower" for a hackathon demo).
"""
import json
import os
from typing import Dict, List, Tuple

SCHEMES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "seed_data", "schemes.json")

with open(SCHEMES_PATH, "r", encoding="utf-8") as f:
    SCHEMES = json.load(f)

_BOOL_KEYS = (
    "owns_land", "owns_pucca_house", "has_girl_child_under_10", "bpl_or_seci_listed",
    "has_disability", "currently_studying", "is_pregnant_or_lactating", "has_bank_account",
)


def _human_label(key: str, value) -> str:
    if key == "min_age":
        return f"Minimum age {value}"
    if key == "max_age":
        return f"Maximum age {value}"
    if key == "gender_in":
        return f"Gender: {', '.join(value)}"
    if key == "occupation_in":
        return f"Occupation: {', '.join(value)}"
    if key == "category_in":
        return f"Category: {', '.join(value)}"
    if key == "max_income":
        return f"Annual income up to ₹{int(value):,}"
    if key == "owns_land":
        return "Owns agricultural land" if value else "Does not own agricultural land"
    if key == "owns_pucca_house":
        return "Owns a pucca house" if value else "Does not own a pucca house"
    if key == "has_girl_child_under_10":
        return "Has a girl child under 10"
    if key == "bpl_or_seci_listed":
        return "Below Poverty Line / SECC listed"
    if key == "has_disability":
        return "Has a certified disability (80%+)"
    if key == "currently_studying":
        return "Currently enrolled as a student"
    if key == "is_pregnant_or_lactating":
        return "Pregnant or lactating"
    if key == "has_bank_account":
        return "Has a bank account"
    return key


def _check_criterion(key: str, expected, profile: Dict) -> Tuple[bool, bool]:
    """Returns (passed, applicable). applicable=False if we don't have enough
    profile info to judge (treated as neutral, doesn't fail the scheme outright
    but is reported so the user knows what's still needed)."""
    if key == "min_age":
        if profile.get("age") is None:
            return False, False
        return profile["age"] >= expected, True
    if key == "max_age":
        if profile.get("age") is None:
            return False, False
        return profile["age"] <= expected, True
    if key == "gender_in":
        if not profile.get("gender"):
            return False, False
        return profile["gender"].lower() in [g.lower() for g in expected], True
    if key == "occupation_in":
        if not profile.get("occupation"):
            return False, False
        occ = profile["occupation"].lower()
        return any(o.lower() in occ or occ in o.lower() for o in expected), True
    if key == "category_in":
        if not profile.get("category"):
            return False, False
        return profile["category"].lower() in [c.lower() for c in expected], True
    if key == "max_income":
        if profile.get("annual_income") is None:
            return False, False
        return profile["annual_income"] <= expected, True
    if key in _BOOL_KEYS:
        if profile.get(key) is None:
            return False, False
        return bool(profile[key]) == bool(expected), True
    return True, True


def evaluate_schemes(profile: Dict) -> Dict[str, List[Dict]]:
    eligible = []
    almost_eligible = []

    for scheme in SCHEMES:
        criteria = scheme["criteria"]
        matched, missing, failed = [], [], []

        for key, expected in criteria.items():
            passed, applicable = _check_criterion(key, expected, profile)
            label = _human_label(key, expected)
            if not applicable:
                missing.append(label)
            elif passed:
                matched.append(label)
            else:
                failed.append(label)

        total = len(criteria)
        match_score = round(len(matched) / total, 2) if total else 0

        result = {
            **{k: scheme[k] for k in ("id", "name", "category", "description", "benefit",
                                        "documents", "apply_url")},
            "match_score": match_score,
            "matched_criteria": matched,
            "missing_criteria": missing + failed,
        }

        if not failed and not missing:
            result["status"] = "eligible"
            eligible.append(result)
        elif not failed and missing:
            # We just don't have enough info yet -> still show as a strong candidate
            result["status"] = "eligible"
            eligible.append(result)
        elif len(failed) <= 1 and len(matched) >= 1:
            result["status"] = "almost_eligible"
            almost_eligible.append(result)

    eligible.sort(key=lambda s: -s["match_score"])
    almost_eligible.sort(key=lambda s: -s["match_score"])
    return {"eligible": eligible, "almost_eligible": almost_eligible}


def all_schemes() -> List[Dict]:
    return SCHEMES
