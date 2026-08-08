import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

# A shared secret government employees must provide at signup, so anyone
# can't just register themselves as a government account. In a real system
# this would be an invite/SSO flow tied to an official department directory.
GOV_REGISTRATION_CODE = os.environ.get("GOV_REGISTRATION_CODE", "CIVIC-GOV-2026")


@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(400, "An account with this email already exists.")

    role = payload.role if payload.role in ("citizen", "government") else "citizen"
    if role == "government":
        if not payload.government_code or payload.government_code != GOV_REGISTRATION_CODE:
            raise HTTPException(403, "Invalid government registration code. Contact your department admin for one.")

    user = models.User(
        name=payload.name,
        email=email,
        hashed_password=auth_service.hash_password(payload.password),
        role=role,
        department=payload.department if role == "government" else None,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_service.create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user or not auth_service.verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password.")
    token = auth_service.create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth_service.get_current_user)):
    return current_user
