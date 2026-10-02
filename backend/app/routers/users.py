from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..common import Email, Password, ensure_email_free, like, page_params, paginate
from ..db import get_db
from ..deps import require_roles
from ..models import Appointment, Patient, User
from ..security import hash_password
from ..serializers import user_out

router = APIRouter(prefix="/users", tags=["Utilisateurs"])
Role = Literal["ADMIN", "DOCTOR", "PATIENT"]


class UserIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: Email
    role: Role
    active: bool = True


class UserCreate(UserIn):
    password: Password


def _get(db, id) -> User:
    u = db.get(User, id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    return u


@router.get("")
def list_users(search: str = "", role: Role | None = None, pg=Depends(page_params),
               db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    q = select(User).where(User.name.ilike(like(search)) | User.email.ilike(like(search))).order_by(User.name)
    if role:
        q = q.where(User.role == role)
    items, total = paginate(db, q, *pg)
    return {"items": [user_out(u) for u in items], "total": total}


@router.post("", status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    if body.role == "DOCTOR":
        raise HTTPException(400, "Créez les médecins depuis la page Médecins (spécialité obligatoire)")
    ensure_email_free(db, body.email)
    u = User(name=body.name.strip(), email=body.email, password_hash=hash_password(body.password),
             role=body.role, active=body.active)
    if body.role == "PATIENT":
        u.patient = Patient()
    db.add(u)
    db.commit()
    return user_out(u)


@router.put("/{id}")
def update_user(id: int, body: UserIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("ADMIN"))):
    u = _get(db, id)
    ensure_email_free(db, body.email, id)
    if u.id == admin.id and (body.role != "ADMIN" or not body.active):
        raise HTTPException(400, "Vous ne pouvez pas retirer vos propres droits ni désactiver votre compte")
    if body.role == "DOCTOR" and not u.doctor:
        raise HTTPException(400, "Ce compte n'a pas de profil médecin : créez-le depuis la page Médecins")
    if body.role == "PATIENT" and not u.patient:
        u.patient = Patient()
    u.name, u.email, u.role, u.active = body.name.strip(), body.email, body.role, body.active
    db.commit()
    return user_out(u)


@router.delete("/{id}", status_code=204)
def delete_user(id: int, db: Session = Depends(get_db), admin: User = Depends(require_roles("ADMIN"))):
    u = _get(db, id)
    if u.id == admin.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    profile_id = (u.doctor.id if u.doctor else None, u.patient.id if u.patient else None)
    has_appointments = db.scalar(select(func.count()).select_from(Appointment).where(
        (Appointment.doctor_id == profile_id[0]) | (Appointment.patient_id == profile_id[1])))
    if has_appointments:
        raise HTTPException(409, "Impossible de supprimer : ce compte a des rendez-vous. Désactivez-le plutôt.")
    db.delete(u)
    db.commit()
    return Response(status_code=204)
