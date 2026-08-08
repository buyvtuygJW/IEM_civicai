"""Shared India place-name resolver (offline gazetteer).

Both the AI path and the rule-based path funnel their extracted area string
through this module so complaints get a *consistent* canonical locality no
matter how the text was parsed. It answers three questions:

  * resolve(candidate)      -> given an area string ("bengaluru", "WB",
                               "Rohini"), return a canonical place + state.
  * extract_from_text(text) -> find a place mentioned anywhere in free text
                               (used when no explicit area was given).
  * list_states()           -> all 28 states + 8 UTs, for dropdowns / APIs.
  * normalize_state(name)    -> canonical state name ("orissa" -> "Odisha").

Design notes (kept deliberately conservative):
  * It ENRICHES/validates a candidate; it never throws away a non-empty raw
    string it can't recognise (a real-but-obscure mohalla shouldn't vanish
    just because it isn't in the gazetteer).
  * Data lives in seed_data/india_places.json. It covers all states/UTs and
    major cities/districts — not every village. Swap in a GeoNames IN dump in
    the same shape for full coverage.
  * Pure standard library (json/re/unicodedata/difflib) — no extra deps.
"""
import json
import os
import re
import unicodedata
from difflib import get_close_matches
from typing import Dict, List, Optional

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "seed_data", "india_places.json")

with open(_DATA_PATH, "r", encoding="utf-8") as _f:
    _STATES: List[Dict] = json.load(_f)["states"]

# Minimum length for a match pulled out of free-flowing text, to avoid short
# aliases like "up"/"tn"/"ap" colliding with ordinary English words.
_MIN_EXTRACT_LEN = 4


def _normalize(text: str) -> str:
    """Lowercase, drop punctuation, collapse whitespace. Unicode-aware so
    Devanagari/Bengali/Tamil scripts survive intact (their vowel signs are
    word characters, so we must NOT strip combining marks here)."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = text.casefold()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


# ── Build lookup indexes once at import ────────────────────────────────────
_STATE_BY_ALIAS: Dict[str, Dict] = {}   # normalized alias -> state record
_CITY_INDEX: Dict[str, Dict] = {}       # normalized city  -> {city, state, state_code}
_STATE_META: List[Dict] = []            # for list_states()

for _s in _STATES:
    _rec = {
        "state": _s["name"],
        "state_code": _s["code"],
        "capital": _s["capital"],
        "type": _s["type"],
    }
    _STATE_META.append({"code": _s["code"], "name": _s["name"],
                        "capital": _s["capital"], "type": _s["type"]})
    for _alias in [_s["name"], *_s.get("aliases", [])]:
        _STATE_BY_ALIAS.setdefault(_normalize(_alias), _rec)
    for _city in _s.get("cities", []):
        # First occurrence wins on duplicate city names across states, so the
        # states listed earlier take precedence for ambiguous names.
        _CITY_INDEX.setdefault(_normalize(_city), {
            "city": _city, "state": _s["name"], "state_code": _s["code"],
        })

_ALL_CITY_NORMS = list(_CITY_INDEX.keys())
_ALL_STATE_NORMS = list(_STATE_BY_ALIAS.keys())


def _ngrams(tokens: List[str], max_n: int = 3):
    """Yield (gram_string, token_length) longest-first so multi-word places
    ('tamil nadu', 'navi mumbai') win over their fragments."""
    n = min(max_n, len(tokens))
    for size in range(n, 0, -1):
        for i in range(len(tokens) - size + 1):
            yield " ".join(tokens[i:i + size]), size


def _city_result(norm_city: str, confidence: float) -> Dict:
    rec = _CITY_INDEX[norm_city]
    return {
        "matched": norm_city,
        "display": f"{rec['city']}, {rec['state']}",
        "city": rec["city"],
        "state": rec["state"],
        "state_code": rec["state_code"],
        "type": "city",
        "confidence": confidence,
    }


def _state_result(norm_alias: str, confidence: float) -> Dict:
    rec = _STATE_BY_ALIAS[norm_alias]
    return {
        "matched": norm_alias,
        "display": rec["state"],
        "city": None,
        "state": rec["state"],
        "state_code": rec["state_code"],
        "type": "state",
        "confidence": confidence,
    }


def resolve(candidate: Optional[str]) -> Optional[Dict]:
    """Resolve an explicit area string to a canonical place. Returns None if
    nothing plausible matches (caller should then keep the raw string)."""
    norm = _normalize(candidate)
    if not norm:
        return None

    # Whole string is exactly a state alias, e.g. "west bengal" / "wb".
    if norm in _STATE_BY_ALIAS:
        return _state_result(norm, 1.0)
    # Whole string is exactly a known city.
    if norm in _CITY_INDEX:
        return _city_result(norm, 1.0)

    # Otherwise scan windows; a city hit beats a state hit, longest gram wins.
    tokens = norm.split()
    state_hit = None
    for gram, _size in _ngrams(tokens):
        if gram in _CITY_INDEX:
            return _city_result(gram, 0.85)
        if state_hit is None and gram in _STATE_BY_ALIAS:
            state_hit = gram
    if state_hit:
        return _state_result(state_hit, 0.8)

    # Last resort: fuzzy match a single typo'd token/phrase.
    fuzzy = get_close_matches(norm, _ALL_CITY_NORMS, n=1, cutoff=0.86)
    if fuzzy:
        return _city_result(fuzzy[0], 0.6)
    fuzzy = get_close_matches(norm, _ALL_STATE_NORMS, n=1, cutoff=0.9)
    if fuzzy:
        return _state_result(fuzzy[0], 0.6)
    return None


def extract_from_text(text: str) -> Optional[Dict]:
    """Find a place named anywhere in free text (e.g. a typed complaint). Only
    matches curated gazetteer entries, and ignores very short tokens to avoid
    false positives from ordinary words."""
    norm = _normalize(text)
    if not norm:
        return None
    tokens = norm.split()

    best_city = None
    best_state = None
    for gram, _size in _ngrams(tokens):
        if len(gram) < _MIN_EXTRACT_LEN:
            continue
        if best_city is None and gram in _CITY_INDEX:
            best_city = gram  # longest-first, so first city hit is the best
        if best_state is None and gram in _STATE_BY_ALIAS:
            best_state = gram
        if best_city:
            break
    if best_city:
        return _city_result(best_city, 0.75)
    if best_state:
        return _state_result(best_state, 0.7)
    return None


def list_states() -> List[Dict]:
    """All states + UTs, sorted by name — suitable for a dropdown."""
    return sorted(_STATE_META, key=lambda s: s["name"])


def normalize_state(name: Optional[str]) -> Optional[str]:
    """Canonicalize a free-text state name ('orissa' -> 'Odisha', 'dilli' ->
    'Delhi'). Returns the trimmed original if it isn't recognised, and None for
    empty input, so it's always safe to call."""
    if not name or not name.strip():
        return name
    norm = _normalize(name)
    if norm in _STATE_BY_ALIAS:
        return _STATE_BY_ALIAS[norm]["state"]
    # A city name resolves to its state too, e.g. "mumbai" -> "Maharashtra".
    if norm in _CITY_INDEX:
        return _CITY_INDEX[norm]["state"]
    fuzzy = get_close_matches(norm, _ALL_STATE_NORMS, n=1, cutoff=0.9)
    if fuzzy:
        return _STATE_BY_ALIAS[fuzzy[0]]["state"]
    return name.strip()
