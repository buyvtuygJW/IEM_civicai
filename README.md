# CivicAI

Your AI-powered gateway to government services and local governance.

Built for IEMHACKS 4.0. Two completely separate sides:

- **Citizens** get Home, Welfare Copilot, and CivicWatch — check eligibility, file complaints
  (by voice, in 9 languages, or text), and track their own complaint history. Nothing else.
- **Government accounts** get a focused console — Dashboard, Complaints Reported, and Welfare —
  with zero access to the citizen-facing pages. Only they can mark a complaint in-progress or
  resolved.

## Modules

1. **🪪 Welfare Copilot** — a wide eligibility questionnaire (personal, logical, and academic
   questions — category, marital status, residence, family size, education, student status,
   maternity status, bank account) matched against **17 schemes spanning every age group**,
   from infant nutrition support to senior citizen pensions. Open to everyone, no login required.
2. **📍 CivicWatch** — voice (9 Indian languages) or text complaint intake → AI classification →
   authority assignment → status tracking. Citizens can file as a guest or logged in; logged-in
   citizens get a "my complaints" view.
3. **🖥️ Government Console** — three focused sections:
   - **Dashboard** — complaint hotspots, category mix, resolution/volume trends, priority
     breakdown. Complaint operations only.
   - **Complaints Reported** — the full complaint list with status-update controls.
   - **Welfare** — scheme adoption analytics, eligibility checks by state, and the full scheme
     catalog. Kept separate from the Dashboard so welfare and complaint data don't compete for
     the same screen.
4. **🎙️ Voice + Regional Language** — say *"Mere area mein street light kharab hai"* (or the
   same in Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, or Punjabi) and
   CivicWatch turns it into a structured, routed, geolocated complaint automatically.

## Accounts & roles

Every account is either a **citizen** or a **government** account:

- Citizens register freely and can file/track complaints and check eligibility. Visiting a
  government-only URL redirects them to `/`.
- Government accounts pick their **department from a predefined list** (kept in sync with the
  departments CivicWatch routes complaints to) and need a registration code
  (`GOV_REGISTRATION_CODE` env var, defaults to `CIVIC-GOV-2026`) — in a real deployment this
  would be tied to an actual department directory/SSO instead of a shared secret. Visiting a
  citizen-facing URL (`/`, `/welfare`, `/civicwatch`) redirects them straight to `/dashboard` —
  the government console never doubles as a citizen site.
- Only government accounts can call the endpoints that list all complaints, change a complaint's
  status, view the operations dashboard, or view welfare analytics — enforced server-side with
  JWT auth (`GET /api/complaints`, `PATCH /api/complaints/{id}/status`,
  `GET /api/dashboard/summary`, `GET /api/welfare/admin/overview`).

A direct "Register your official account" link is available from the Login page, the Welfare
Copilot page, and the Home page's Government Console card — all pointing to
`/register?role=government`, which preselects the government signup tab.

Demo accounts (seeded automatically): `citizen@demo.in` / `official@demo.in`, both with password
`demo1234`.

## Architecture

```
civicai/
├── backend/     FastAPI + SQLite (Python)
│   ├── app/
│   │   ├── routers/       auth.py, welfare.py (+ /admin/overview), complaints.py,
│   │   │                  dashboard.py, voice.py
│   │   ├── services/      auth.py (JWT/passwords), eligibility_engine.py, classifier.py
│   │   │                  (9-language keyword rules), voice_parser.py, geocoding.py,
│   │   │                  escalation.py, ai_client.py
│   │   ├── models.py      User, Complaint, StatusLog, EligibilityCheck
│   │   └── main.py        FastAPI app
│   └── seed_data/schemes.json   17 government schemes with eligibility rules
└── frontend/    React (Vite) + Tailwind + Recharts
    └── src/
        ├── pages/          Home, WelfareCopilot, CivicWatch, AdminComplaints,
        │                   AdminWelfare, Dashboard, Login, Register
        ├── components/     Navbar, VoiceInput, Stamp, ChakraIcon,
        │                   ProtectedRoute, CitizenOnlyRoute
        └── context/        AuthContext (JWT session handling)
```

Everything works **fully offline** with rule-based logic (keyword classifiers in 9 languages, a
scheme-criteria matcher, a lightweight Hinglish gloss for voice transcripts) so the demo never
breaks without internet access. Set `ANTHROPIC_API_KEY` and the classifier, voice parser, and
Welfare Copilot chat all silently upgrade to use Claude for much higher accuracy on messy,
real-world, multilingual phrasing — see `backend/app/services/ai_client.py`.

**A note on the language keyword lists**: `classifier.py`'s offline fallback includes a handful
of hand-picked keywords per category for Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada,
Malayalam, and Punjabi (in addition to the more thoroughly-covered Hindi/Hinglish). These cover
the single most common word for each issue type, not comprehensive vocabulary — treat them as a
reasonable starting point rather than exhaustively verified translations. Claude, when enabled,
handles all nine languages far more robustly than any fixed keyword list could.

## The location fix

CivicWatch requests your location automatically as soon as the page loads (no more forgetting to
click a button before speaking), and the backend reverse-geocodes GPS coordinates (via
OpenStreetMap's free Nominatim API, no key required) into a real locality name whenever neither
the spoken transcript nor a typed area gave us one. "Unspecified" is a last resort, not the
default. This needs outbound internet access to `nominatim.openstreetmap.org` from wherever the
backend runs.

## Design system

Glass/gradient/light, built around Indian civic identity:

- **Colour**: a soft gradient background (desaturated saffron/indigo/green fields), true
  Indian-flag saffron (`#FF9933`) and flag green (`#138808`) as sparing accents, an indigo→blue
  gradient as the primary action colour.
- **Type**: Poppins for headings, Inter for body text, JetBrains Mono for case numbers/data.
- **Signature graphic**: a 24-spoke wheel motif (`ChakraIcon.jsx`) used as the logomark and hero
  visual.
- **Module colour-coding**: Welfare Copilot is saffron, CivicWatch is indigo, the Government
  Console is green.
- Most of this lives in `frontend/src/index.css` as a handful of reusable classes
  (`.ledger-card` for glass cards, `.btn-primary`/`.btn-secondary`, `.stamp` for status pills).

## Running it with Docker Desktop

```bash
cd civicai
docker compose up --build
```

Builds both images, starts them, seeds demo data automatically. Once you see `VITE ready`:

- **App**: http://localhost:5173
- **API docs**: http://localhost:8000/docs

To stop: `Ctrl+C`, then `docker compose down`. Demo data persists in `backend/civicai.db` on your
machine between runs.

**To enable Claude-powered classification/voice-parsing/chat:** copy `.env.example` (repo root)
to `.env` and add `ANTHROPIC_API_KEY=sk-ant-...`. Compose reads it automatically.

## Running it locally without Docker

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # optionally add ANTHROPIC_API_KEY / GOV_REGISTRATION_CODE / JWT_SECRET
python seed_demo_data.py    # populates demo accounts + 60 demo complaints
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

**Voice input needs a secure context** — `http://localhost` works, but a plain IP address will
silently block the microphone in most browsers.

## Demo script (for judges)

1. **Home** — colour-coded module pitch, chakra hero graphic.
2. **Register** as a citizen, then **CivicWatch** — allow location access, pick a language (try
   Tamil or Bengali), speak a complaint → watch it get classified, geolocated, and filed.
3. **Welfare Copilot** — fill in a young SC/ST student profile (age 20, category: SC, currently
   studying: yes, income: ₹1,50,000) → see the Post-Matric Scholarship and other matches. Try an
   infant profile (age 2) or a senior citizen profile (age 70, BPL) to show the age-group spread.
4. **Log out, log in as** `official@demo.in` — show the government nav has *only* Dashboard,
   Complaints Reported, and Welfare. Mark the complaint from step 2 in-progress on Complaints
   Reported, show the Dashboard's live charts, then show Welfare's scheme-adoption analytics.
   Try visiting `/civicwatch` while logged in as government — it bounces straight back to the
   dashboard.

## What's still stubbed for the hackathon demo

- **Photos**: accepted but not run through image classification.
- **Notifications**: escalation is computed on read rather than pushed via SMS/email.
- **Government onboarding**: a shared registration code is fine for a demo; a real deployment
  needs department-verified accounts (SSO or admin-approval flow).
- **Scale**: `DATABASE_URL` is already wired for a drop-in swap to Postgres — no code changes
  required (see `backend/app/database.py`).
- **Language coverage**: the offline keyword classifier's non-Hindi language support is a
  starting point, not exhaustive — accuracy improves substantially with `ANTHROPIC_API_KEY` set.
