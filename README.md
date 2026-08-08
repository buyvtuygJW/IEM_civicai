# CivicAI

Your AI-powered gateway to government services and local governance.

Built for IEMHACKS 4.0. Two sides, one system:

- **Citizens** can check welfare eligibility and file complaints (by voice or text) — that's it.
  They can see their own complaint history, but only the responsible government account can
  move a complaint forward.
- **Government accounts** get a complaint management console (filter, mark in-progress/resolved)
  and a real-time operations dashboard — hotspots, resolution times, escalations, scheme adoption.

## Modules

1. **🪪 Welfare Copilot** — profile-based eligibility engine matched against 10 real Indian
   welfare schemes, a document checklist per scheme, and a free-form chat assistant. Open to
   everyone, no login required.
2. **📍 CivicWatch** — voice or text complaint intake → AI classification → authority assignment
   → status tracking. Anyone can file (as a guest or logged in); logged-in citizens get a
   "my complaints" view.
3. **🖥️ Government Console** — the full complaint list with status-update controls, and the
   real-time dashboard (hotspots, resolution trends, escalations, scheme adoption). Government
   accounts only — gated both in the UI and at the API level.
4. **🎙️ Voice + Regional Language** — say *"Mere area mein street light kharab hai"* and
   CivicWatch turns it into a structured, routed, geolocated complaint automatically.

## Accounts & roles

Every account is either a **citizen** or a **government** account:

- Citizens can register freely and can file/track complaints and check eligibility.
- Government accounts require a registration code (`GOV_REGISTRATION_CODE` env var, defaults to
  `CIVIC-GOV-2026` for the demo) — in a real deployment this would be tied to an actual
  department directory/SSO instead of a shared secret.
- Only government accounts can call the endpoints that list all complaints or change a
  complaint's status (`GET /api/complaints`, `PATCH /api/complaints/{id}/status`,
  `GET /api/dashboard/summary`) — enforced server-side with JWT auth, not just hidden in the UI.

Demo accounts (seeded automatically): `citizen@demo.in` / `official@demo.in`, both with password
`demo1234`.

## Architecture

```
civicai/
├── backend/     FastAPI + SQLite (Python)
│   ├── app/
│   │   ├── routers/       auth.py, welfare.py, complaints.py, dashboard.py, voice.py
│   │   ├── services/      auth.py (JWT/passwords), eligibility_engine.py, classifier.py,
│   │   │                  voice_parser.py, geocoding.py, escalation.py, ai_client.py
│   │   ├── models.py      User, Complaint, StatusLog, EligibilityCheck
│   │   └── main.py        FastAPI app
│   └── seed_data/schemes.json   10 government schemes with eligibility rules
└── frontend/    React (Vite) + Tailwind + Recharts
    └── src/
        ├── pages/          Home, WelfareCopilot, CivicWatch, AdminComplaints,
        │                   Dashboard, Login, Register
        ├── components/     Navbar, VoiceInput, Stamp, ChakraIcon, ProtectedRoute
        └── context/        AuthContext (JWT session handling)
```

Everything works **fully offline** with rule-based logic (keyword classifiers, a scheme-criteria
matcher, a lightweight Hinglish gloss for voice transcripts) so the demo never breaks without
internet access. Set `ANTHROPIC_API_KEY` and the classifier, voice parser, and Welfare Copilot
chat all silently upgrade to use Claude for much higher accuracy on messy, real-world phrasing —
see `backend/app/services/ai_client.py`.

## The location fix

Earlier versions could show "Unspecified" as a complaint's area when using voice input. Two
separate fixes address this:

1. **The frontend now requests your location automatically** as soon as you open CivicWatch,
   instead of waiting for you to remember to click a "use my location" button before speaking.
2. **The backend reverse-geocodes GPS coordinates** (via OpenStreetMap's free Nominatim API, no
   key required — see `services/geocoding.py`) into a real locality name whenever neither the
   spoken transcript nor a typed area gave us one. "Unspecified" is now a last resort, not the
   default.

This needs outbound internet access to `nominatim.openstreetmap.org` from wherever the backend
runs — normal on your machine or in Docker, just flag it if you deploy somewhere with restricted
egress.

## Design system

Glass/gradient/light, built around Indian civic identity rather than a generic SaaS look:

- **Colour**: a soft gradient background (desaturated saffron/indigo/green fields), true
  Indian-flag saffron (`#FF9933`) and flag green (`#138808`) used as sparing accents, an
  indigo→blue gradient as the primary action colour.
- **Type**: Poppins for headings, Inter for body text, JetBrains Mono for case numbers/data.
- **Signature graphic**: a 24-spoke wheel motif (`ChakraIcon.jsx`) used as the logomark and hero
  visual — a wheel-of-progress metaphor, not a literal emblem reproduction.
- **Module colour-coding**: Welfare Copilot is saffron, CivicWatch is indigo, the Government
  Console is green — consistent everywhere so colour itself becomes navigation.
- Nearly all of this lives in `frontend/src/index.css` as a handful of reusable classes
  (`.ledger-card` for glass cards, `.btn-primary`/`.btn-secondary`, `.stamp` for status pills), so
  most pages pick up the look through shared classes rather than one-off styling.

## Running it with Docker Desktop

```bash
cd civicai
docker compose up --build
```

Builds both images, starts them, seeds demo data automatically, and wires the frontend's
`/api/*` calls to the backend container. Once you see `VITE ready` in the logs, open:

- **App**: http://localhost:5173
- **API docs**: http://localhost:8000/docs

To stop: `Ctrl+C`, then `docker compose down`. Demo data persists in `backend/civicai.db` on your
machine between runs (bind-mounted, not locked inside the container).

**To enable Claude-powered classification/voice-parsing/chat:** copy `.env.example` (repo root)
to `.env` and add `ANTHROPIC_API_KEY=sk-ant-...`. Compose reads it automatically.

**Live-reload while developing:** both services mount your source folders into the containers,
so editing any file under `backend/` or `frontend/src/` picks up instantly.

**Common gotchas:**
- Make sure Docker Desktop is running before `docker compose up`.
- If ports 8000/5173 are taken, edit the left side of `ports:` in `docker-compose.yml`.
- First run takes a minute or two (npm/pip install happen inside the containers).

## Running it locally without Docker

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt

cp .env.example .env        # optionally add ANTHROPIC_API_KEY / GOV_REGISTRATION_CODE / JWT_SECRET
python seed_demo_data.py    # populates demo accounts + 60 demo complaints
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` to the backend.

**Voice input needs a secure context** — `http://localhost` works, but a plain IP address
(`http://192.168.x.x`) will silently block the microphone in most browsers. Use `localhost`.

## Demo script (for judges)

1. **Home** — show the colour-coded module pitch and the chakra hero graphic.
2. **Register** as a citizen, then **CivicWatch** — allow location access, click the mic, say
   *"Mere area mein street light kharab hai"* → watch it get classified and filed with a case
   number and a real location, then show it appearing under "Your complaints."
3. **Welfare Copilot** — fill in a farmer profile (occupation: Farmer, income: ₹1,50,000, owns
   land: Yes) → see PM-KISAN and other matches with document checklists.
4. **Log out, log in as** `official@demo.in` (or register a new government account with code
   `CIVIC-GOV-2026`) — show **Manage Complaints** (mark the complaint from step 2 in-progress)
   and the **Dashboard** updating live. Then show that a citizen account can't reach either page.

## What's still stubbed for the hackathon demo

- **Photos**: the complaint form accepts an image but it isn't run through image classification —
  a natural next step is sending it to Claude's vision input alongside the description.
- **Notifications**: escalation is computed on read (SLA thresholds in `services/escalation.py`)
  rather than pushed via SMS/email.
- **Government onboarding**: a shared registration code is fine for a demo, but a real deployment
  needs actual department-verified accounts (SSO or an admin-approval flow).
- **Scale**: SQLite is perfect for a demo; `DATABASE_URL` is already wired for a drop-in swap to
  Postgres when you need it (see `backend/app/database.py`) — no other code changes required.
