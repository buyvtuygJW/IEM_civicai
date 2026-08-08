# IndiCivicAI

File and track civic complaints by **voice or text** in multiple Indian
languages, auto-route them to the right department, and check **welfare-scheme
eligibility** with an AI Welfare Copilot.

---

# 📖 User Guide

## 1. Run it

### Docker (easiest — runs everything)

```bash
docker compose up --build
```

- App:      http://localhost:5173
- API:      http://localhost:8000

### Or run the two services yourself

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 2. Add your own AI key (recommended)

The app **works out of the box with no key** — but complaint classification,
voice parsing, and the Welfare Copilot are much smarter with an LLM. Plug in
**your own** Anthropic or OpenAI key:

```bash
cp .env.example .env          # (Docker, repo root)
# or:  cp backend/.env.example backend/.env   (running the backend directly)
```

Then open `.env` and set **one** key:

```ini
ANTHROPIC_API_KEY=sk-ant-...   # uses Claude  (wins if more than one is set)
OPENAI_API_KEY=sk-...          # uses OpenAI
GEMINI_API_KEY=...             # uses Gemini — genuinely free tier, no card needed:
                                #   https://aistudio.google.com/apikey
```

Restart the app. That's it.

## 3. Use it

- **File a complaint** — tap the mic and speak (English/Hindi/other Indian
  languages), or type it. IndiCivicAI figures out the category, department, and
  priority, and pins the locality.
- **Track a complaint** — look it up any time by its case number.
- **Welfare Copilot** — fill in your profile (age, income, occupation, state)
  to see which government schemes you qualify for and what documents you need.

> **Voice tip:** use **Chrome or Edge** and allow the microphone. Speech-to-text
> runs in your browser and needs an internet connection.

---
---

# 🛠️ Technical Reference

Everything below is for developers — you don't need it to use the app.

## Stack

- **Backend:** FastAPI + SQLAlchemy (SQLite by default) — `backend/`
- **Frontend:** React + Vite — `frontend/`
- **AI:** pluggable Anthropic, OpenAI, **or** Gemini, with a full offline fallback

## Database & persistence

- A **real on-disk SQLite file** (not in-memory) at `backend/indicivicai.db`,
  created on first boot and seeded by `seed_demo_data.py`.
- Persists across restarts and `docker compose down`/`up` (the `backend` folder
  is bind-mounted). It is gitignored.
- Reset all data: stop the app and delete `backend/indicivicai.db`.
- Swap databases with no code changes:
  `DATABASE_URL=postgresql://user:password@host:5432/indicivicai`.

## AI integration

Provider is auto-selected from whichever key is set (`ANTHROPIC_API_KEY` takes
priority, then `OPENAI_API_KEY`, then `GEMINI_API_KEY`); the key is read
**only** from the environment and never committed. Gemini has a genuinely free
tier — grab a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
no credit card required — making it the easiest way to try the AI-powered path
without spending anything. Verify at `GET /api/health` →
`{"ai": {"enabled": true, "provider": "..."}}`.

Every AI call fails soft — on any error it returns `None` and the caller uses
rule-based logic instead:

| Feature | With a key | Offline (no key) |
| --- | --- | --- |
| Complaint classification | LLM assigns category / department / priority | keyword rules across Indian languages |
| Voice parsing | LLM cleans & structures the transcript | Hinglish→English gloss + regex |
| Welfare Copilot chat | free-form Q&A grounded in the scheme list | canned guidance |

Speech-to-text itself is **not** in the backend — it's the browser's Web Speech
API. The server only receives the finished text transcript.

## Location resolution

A single shared India gazetteer (`backend/app/services/place_resolver.py`, data
in `backend/seed_data/india_places.json`) canonicalizes every complaint's area,
whichever path produced it (LLM or rule-based):

- covers **all 28 states + 8 union territories** with aliases (incl. some
  native-script and colloquial names) and major cities/districts;
- normalizes messy input — `bengaluru` / `Bangalore` / `blr` → `Bengaluru,
  Karnataka` — so analytics group consistently;
- keeps a real-but-unrecognised locality **verbatim** instead of dropping it;
- normalizes the welfare profile state (`orissa` → `Odisha`) and powers an
  optional `state_in` eligibility criterion.

`GET /api/welfare/states` returns the full list (`{code, name, capital, type}`).

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | *(empty)* | Use Claude. Priority if more than one key is set. |
| `OPENAI_API_KEY` | *(empty)* | Use OpenAI. Next priority. |
| `GEMINI_API_KEY` | *(empty)* | Use Gemini (also accepts `GOOGLE_API_KEY`). Free tier, no card required — [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `AI_MODEL` | `claude-sonnet-5` / `gpt-4o-mini` / `gemini-flash-latest` | Override the model. |
| `JWT_SECRET` | `dev-secret-change-me-in-production` | Signs login tokens. **Change for production.** |
| `GOV_REGISTRATION_CODE` | `CIVIC-GOV-2026` | Code to register a government account. **Change for production.** |
| `DATABASE_URL` | `sqlite:///./indicivicai.db` | Database connection string. |

## Possible improvements

- **Village/ward-level places:** current coverage is states/UTs + major cities.
  Load a [GeoNames](https://www.geonames.org/) `IN` dump into the same JSON
  shape for full granularity.
- **Auth hardening:** replace the shared `GOV_REGISTRATION_CODE` with SSO or
  admin approval; set a strong `JWT_SECRET`; restrict CORS (currently `*`).
- **State as a first-class field:** complaints fold state into the area string;
  a dedicated `state` column would enable richer dashboard grouping.
- **Ambiguous place names** (e.g. a city name shared by two states) currently
  resolve to the first match — add population/GPS-based disambiguation.
