"""Optional LLM integration — bring your own key (Anthropic, OpenAI, *or* Gemini).

IndiCivicAI is designed to work fully offline with rule-based logic so the demo
never breaks without internet/API access. If an API key is present in the
environment, several services upgrade to use an LLM for smarter classification,
voice-transcript parsing, and natural-language eligibility explanations.

Provider is chosen automatically from whichever key is set:
  * ANTHROPIC_API_KEY  -> Claude   (takes priority if more than one is set)
  * OPENAI_API_KEY     -> OpenAI   (next priority)
  * GEMINI_API_KEY      -> Gemini   (also accepts GOOGLE_API_KEY). Has a
    genuinely free tier -- grab a key at https://aistudio.google.com/apikey,
    no credit card required. Recommended if you just want a free prototype.

Override the model with AI_MODEL. Defaults: claude-sonnet-5 / gpt-4o-mini /
gemini-flash-latest.

Every call fails soft (returns None on any error) so callers transparently
fall back to rule-based logic.
"""
import json
import os

import requests

_ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
_OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
_GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

_DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-flash-latest",
}

_PROVIDER = None
_client = None  # unused for the "gemini" provider, which calls its REST API directly

if _ANTHROPIC_KEY:
    try:
        import anthropic
        _client = anthropic.Anthropic()
        _PROVIDER = "anthropic"
    except Exception:
        _client = None

if _PROVIDER is None and _OPENAI_KEY:
    try:
        import openai
        _client = openai.OpenAI()
        _PROVIDER = "openai"
    except Exception:
        _client = None

if _PROVIDER is None and _GEMINI_KEY:
    _PROVIDER = "gemini"

MODEL = os.environ.get("AI_MODEL") or _DEFAULT_MODELS.get(_PROVIDER, "")


def ai_available() -> bool:
    return bool(_PROVIDER) and (_PROVIDER == "gemini" or _client is not None)


def active_provider() -> dict:
    """Small status object for the health endpoint / debugging."""
    return {"enabled": ai_available(), "provider": _PROVIDER, "model": MODEL or None}


def _call_gemini(system_prompt: str, user_prompt: str, max_tokens: int, want_json: bool):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    generation_config = {"maxOutputTokens": max_tokens}
    if want_json:
        generation_config["responseMimeType"] = "application/json"
    resp = requests.post(
        url,
        params={"key": _GEMINI_KEY},
        json={
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": generation_config,
        },
        timeout=20,
    )
    resp.raise_for_status()
    parts = resp.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts).strip()


def _call(system_prompt: str, user_prompt: str, max_tokens: int, want_json: bool):
    """Single place that talks to whichever provider is configured. Returns raw
    text, or None on any failure."""
    if not ai_available():
        return None
    try:
        if _PROVIDER == "anthropic":
            resp = _client.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return "".join(b.text for b in resp.content if b.type == "text").strip()

        if _PROVIDER == "gemini":
            return _call_gemini(system_prompt, user_prompt, max_tokens, want_json)

        # openai
        kwargs = {
            "model": MODEL,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if want_json:
            kwargs["response_format"] = {"type": "json_object"}
        resp = _client.chat.completions.create(**kwargs)
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return None


def _extract_json(text: str):
    """Best-effort parse of a JSON object that may be wrapped in ``` fences or
    prefixed with 'json'."""
    if not text:
        return None
    text = text.strip().strip("`").strip()
    if text.lower().startswith("json"):
        text = text[4:].strip()
    try:
        return json.loads(text)
    except Exception:
        # Some models wrap prose around the object — grab the outermost braces.
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                return None
        return None


def ask_json(system_prompt: str, user_prompt: str, max_tokens: int = 500):
    """Calls the LLM and expects a JSON object back. Returns None on any failure
    so callers can fall back to rule-based logic."""
    return _extract_json(_call(system_prompt, user_prompt, max_tokens, want_json=True))


def ask_text(system_prompt: str, user_prompt: str, max_tokens: int = 500):
    return _call(system_prompt, user_prompt, max_tokens, want_json=False)
