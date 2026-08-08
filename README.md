# HindCivicAi

File and track civic complaints by **voice or text** in 9 Indian languages, auto-route them to the right department, and check **welfare-scheme eligibility** with an AI Welfare Copilot.

Runs fully offline out of the box — add your own AI key for smarter results.
---

# 📖 User Guide

## 1. Run it

**Docker (runs everything):**

```bash
docker compose up --build
```

- App → http://localhost:5173
- API → http://localhost:8000

**Or run the two services yourself:**

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

## 2. Add your own AI key (recommended)

Optional — the app works offline without one — but complaint classification,
voice parsing, and Welfare Copilot chat are much smarter with an LLM.

```bash
cp .env.example .env          # Docker (repo root)
# or:  cp backend/.env.example backend/.env   (backend run directly)
```

Set **one** key in `.env` (priority order is documented there), then restart the
app. **Gemini is free, no card required** — grab a key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## 3. Use it

- **File a complaint** — tap the mic and speak, or type it. HindCivicAi detects
  the category, department, and priority, and pins the locality.
- **Track a complaint** — look it up any time by its case number.
- **Welfare Copilot** — enter your profile (age, income, occupation, state) to
  see the schemes you qualify for and the documents you'll need.

> **Voice:** use **Chrome or Edge** and allow the microphone. Speech-to-text
> runs in your browser and needs an internet connection.

---

# 🛠️ Technical Reference

For developers — not needed to use the app.

## Stack

- **Backend:** FastAPI + SQLAlchemy — `backend/`
- **Frontend:** React + Vite — `frontend/`
- **AI:** pluggable Anthropic / OpenAI / Gemini, with a full offline fallback

## Database

A real **on-disk SQLite file** at `backend/HindCivicAi.db` (not in-memory),
created and seeded on first boot and persisting across restarts and
`docker compose down`/`up` (the `backend` folder is bind-mounted). It is
gitignored. Delete it to reset all data. To scale, point `DATABASE_URL` at
Postgres — no code changes:

```ini
DATABASE_URL=postgresql://user:password@host:5432/HindCivicAi
```

## AI integration

Provider auto-selects from whichever key is set (priority order in
`.env.example`); the key is read from the environment only, never committed.
Verify at `GET /api/health` → `{"ai": {"enabled": true, "provider": "..."}}`.

Every AI call fails soft — on any error it returns `None` and the feature falls
back to rule-based logic:

| Feature | With a key | Offline (no key) |
| --- | --- | --- |
| Complaint classification | LLM picks category / department / priority | keyword rules |
| Voice parsing | LLM cleans & structures the transcript | Hinglish→English gloss + regex |
| Welfare Copilot chat | free-form Q&A over the scheme list | canned guidance |

Speech-to-text is **not** server-side — it's the browser's Web Speech API; the
backend only ever receives the final text transcript.

## Languages

Voice/text complaints are accepted in **9 languages** — English, Hindi, Bengali,
Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi — selectable from
the mic dropdown (`VoiceInput.jsx`). With a key, the LLM handles all nine in
native script or Latin transliteration. Offline, `classifier.py` matches a
handful of native-script keywords per category — the single most common word per
issue type, not exhaustive vocabulary.

