import datetime
import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

# In production, set JWT_SECRET to a long random value and never commit it.
SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week — fine for a demo, shorten for production

# pbkdf2_sha256 is pure Python (no C extension to compile), which keeps the
# Docker image simple. bcrypt/argon2 are stronger for production use.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# auto_error=False lets endpoints work for both logged-in and anonymous users
# (e.g. filing a complaint as a guest) — see get_current_user_optional below.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Returns the logged-in user if a valid token was sent, otherwise None.
    Use this for endpoints that work for both guests and logged-in users."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    return db.query(models.User).filter(models.User.id == int(payload.get("sub"))).first()


def get_current_user(user=Depends(get_current_user_optional)):
    """Requires a valid logged-in user, or raises 401."""
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    return user


def require_role(role: str):
    """Dependency factory: require_role('government') protects an endpoint so
    only that role can call it, e.g. marking a complaint as resolved."""
    def dependency(user: models.User = Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(status_code=403, detail=f"This action is restricted to {role} accounts.")
        return user
    return dependency
