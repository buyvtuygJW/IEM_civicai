"""Optional Claude (Anthropic) integration.

CivicAI is designed to work fully offline with rule-based logic so the demo
never breaks without internet/API access. If an ANTHROPIC_API_KEY is present
in the environment, several services upgrade to use Claude for smarter
classification, voice-transcript parsing, and natural-language eligibility
explanations.
"""
import json
import os

_client = None
_ENABLED = bool(os.environ.get("ANTHROPIC_API_KEY"))

if _ENABLED:
    try:
        import anthropic
        _client = anthropic.Anthropic()
    except Exception:
        _ENABLED = False
        _client = None

MODEL = "claude-sonnet-4-6"


def ai_available() -> bool:
    return _ENABLED and _client is not None


def ask_json(system_prompt: str, user_prompt: str, max_tokens: int = 500):
    """Calls Claude and expects a raw JSON object back. Returns None on any failure
    so callers can fall back to rule-based logic."""
    if not ai_available():
        return None
    try:
        resp = _client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(block.text for block in resp.content if block.type == "text").strip()
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
        return json.loads(text)
    except Exception:
        return None


def ask_text(system_prompt: str, user_prompt: str, max_tokens: int = 500):
    if not ai_available():
        return None
    try:
        resp = _client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in resp.content if block.type == "text").strip()
    except Exception:
        return None
