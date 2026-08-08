import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Defaults to a local SQLite file, which is perfect for a hackathon demo.
# For production, set DATABASE_URL to a real database, e.g.:
#   postgresql://user:password@host:5432/civicai
# No other code changes needed — SQLAlchemy handles the rest.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./civicai.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
