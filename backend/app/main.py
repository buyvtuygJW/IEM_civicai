from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import welfare, complaints, dashboard, voice, auth
from .services import ai_client

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicAI API",
    description="AI-powered gateway to government services and local governance.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only — restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(welfare.router)
app.include_router(complaints.router)
app.include_router(dashboard.router)
app.include_router(voice.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_enabled": ai_client.ai_available()}
