from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..common import Email, Password, ensure_email_free
from ..db import get_db
from ..deps import current_user
from ..models import Patient, User
from ..security import create_token, hash_password, verify_password
from ..serializers import me_out

router = APIRouter(prefix="/auth", tags=["Authentification"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: Email
    password: Password


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """Inscription publique : crée un compte PATIENT et sa fiche patient."""
    ensure_email_free(db, body.email)
    db.add(User(name=body.name.strip(), email=body.email, password_hash=hash_password(body.password),
                role="PATIENT", patient=Patient()))
    db.commit()
    return {}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not user or not user.active or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"token": create_token(user.id), "user": me_out(user)}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return me_out(user)
