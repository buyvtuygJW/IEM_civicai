# CivicAI

An AI-powered gateway to government services and local governance for India:
file & track civic complaints (by voice or text, in multiple Indian languages),
auto-route them to the right department, and check welfare-scheme eligibility
with a Welfare Copilot.

- **Backend:** FastAPI + SQLAlchemy (SQLite by default)
- **Frontend:** React + Vite
- **AI:** bring your own **Anthropic** *or* **OpenAI** key — or run fully offline

---

## 🔑 First: add your own AI key (recommended)

CivicAI runs **offline** on rule-based logic with no key at all — nothing will
crash. But complaint classification, multilingual voice parsing, and the Welfare
Copilot chat are **noticeably better with an LLM**, so the recommended first
step is to plug in **your own key**.

1. Copy the example env file:
   ```bash
   cp .env.example .env          # for Docker (repo root)
   # or, when running the backend directly:
   cp backend/.env.example backend/.env
   ```
2. Open `.env` and set **one** of these to your own key:
   ```ini
   ANTHROPIC_API_KEY=sk-ant-...   # uses Claude   (takes priority if both set)
   OPENAI_API_KEY=sk-...          # uses OpenAI
   # optional: pin a model. Defaults: claude-sonnet-5 / gpt-4o-mini
   AI_MODEL=
   ```

> The key is read **only** from the environment — it is never hardcoded or
> committed. `.env` (and the local `civicai.db`) are gitignored. Confirm the app
> picked it up at `GET /api/health` → `{"ai": {"enabled": true, "provider": ...}}`.

If you leave both keys blank, everything still works — the app transparently
falls back to keyword/rule-based logic.

---

## Quick start

### Option A — Docker (everything at once)

```bash
cp .env.example .env      # add your AI key (see above); optional but recommended
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:8000  (API docs at `/docs`)

### Option B — Run each service directly

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # add your AI key
python seed_demo_data.py   # optional: load demo schemes + sample complaints
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Data & persistence

The database is a **real, on-disk SQLite file** (not in-memory), created at
`backend/civicai.db` on first boot and seeded by `seed_demo_data.py`. It
persists across restarts (and across `docker compose down`/`up`, since the
`backend` folder is bind-mounted). It is gitignored.

To move off SQLite, point `DATABASE_URL` at any SQLAlchemy-supported database —
no code changes needed:

```ini
DATABASE_URL=postgresql://user:password@host:5432/civicai
```

To reset all data, stop the app and delete `backend/civicai.db`.

---

## How the AI features work (and their offline fallback)

| Feature | With a key | Offline (no key) |
| --- | --- | --- |
| Complaint classification | LLM assigns category / department / priority | keyword rules across Indian languages |
| Voice complaint parsing | LLM cleans & structures the transcript | lightweight Hinglish→English gloss + regex |
| Welfare Copilot chat | free-form Q&A grounded in the scheme list | helpful canned guidance |

**Speech-to-text is the browser's job, not the server's.** Voice input uses the
browser's built-in Web Speech API (Chrome/Edge, needs internet); the backend
only ever receives the finished **text** transcript.

---

## Location resolution (all Indian states + UTs)

Every complaint's area — whether extracted by the LLM or by the rule-based
parser — is funnelled through a single shared **India gazetteer**
(`backend/app/services/place_resolver.py`, data in
`backend/seed_data/india_places.json`). It:

- covers **all 28 states + 8 union territories**, with aliases (including some
  native-script and colloquial names) and major cities/districts;
- canonicalizes messy input so `bengaluru`, `Bangalore`, and `blr` all become
  **`Bengaluru, Karnataka`** — keeping complaint analytics consistent;
- keeps a genuine but unrecognised locality **verbatim** rather than dropping it;
- normalizes the welfare profile's state (`orissa` → `Odisha`) and powers an
  optional `state_in` eligibility criterion for state-specific schemes.

Endpoint: `GET /api/welfare/states` returns the full list (`{code, name,
capital, type}`) — handy for a profile dropdown.

> Coverage is states/UTs + major cities/districts, not every village. For
> village/ward-level coverage, load a [GeoNames](https://www.geonames.org/) `IN`
> dump into the same JSON shape.

---

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | *(empty)* | Use Claude. Priority if both keys set. |
| `OPENAI_API_KEY` | *(empty)* | Use OpenAI. |
| `AI_MODEL` | `claude-sonnet-5` / `gpt-4o-mini` | Override the model. |
| `JWT_SECRET` | `dev-secret-change-me-in-production` | Signs login tokens. **Change for real deployments.** |
| `GOV_REGISTRATION_CODE` | `CIVIC-GOV-2026` | Shared code to register a government account. **Change for real deployments.** |
| `DATABASE_URL` | `sqlite:///./civicai.db` | Database connection string. |

All are optional for a local demo — safe defaults are baked in.
