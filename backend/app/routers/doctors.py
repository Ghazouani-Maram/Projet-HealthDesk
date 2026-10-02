from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..common import Email, Password, ensure_email_free, like, page_params, paginate
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import Appointment, Doctor, Specialty, User
from ..security import hash_password
from ..serializers import doctor_out
from ..slots import free_slots

router = APIRouter(prefix="/doctors", tags=["Médecins"])


class DoctorIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: Email
    phone: str | None = Field(None, max_length=30)
    specialtyId: int


class DoctorCreate(DoctorIn):
    password: Password


def _get(db, id) -> Doctor:
    d = db.get(Doctor, id)
    if not d:
        raise HTTPException(404, "Médecin introuvable")
    return d


def _check_specialty(db, id):
    if not db.get(Specialty, id):
        raise HTTPException(404, "Spécialité introuvable")


@router.get("")
def list_doctors(search: str = "", specialtyId: int | None = None, pg=Depends(page_params),
                 db: Session = Depends(get_db), _: User = Depends(current_user)):
    q = select(Doctor).join(User, Doctor.user_id == User.id).where(User.name.ilike(like(search))).order_by(User.name)
    if specialtyId:
        q = q.where(Doctor.specialty_id == specialtyId)
    items, total = paginate(db, q, *pg)
    return {"items": [doctor_out(d) for d in items], "total": total}


@router.get("/{id}/slots")
def doctor_slots(id: int, date: date = Query(...), db: Session = Depends(get_db), _: User = Depends(current_user)):
    _get(db, id)
    return free_slots(db, id, date)


@router.post("", status_code=201)
def create_doctor(body: DoctorCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    ensure_email_free(db, body.email)
    _check_specialty(db, body.specialtyId)
    d = Doctor(specialty_id=body.specialtyId, phone=body.phone or None)
    db.add(User(name=body.name.strip(), email=body.email, password_hash=hash_password(body.password),
                role="DOCTOR", doctor=d))
    db.commit()
    return doctor_out(d)


@router.put("/{id}")
def update_doctor(id: int, body: DoctorIn, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    d = _get(db, id)
    ensure_email_free(db, body.email, d.user_id)
    _check_specialty(db, body.specialtyId)
    d.user.name, d.user.email = body.name.strip(), body.email
    d.phone, d.specialty_id = body.phone or None, body.specialtyId
    db.commit()
    db.refresh(d)
    return doctor_out(d)


@router.delete("/{id}", status_code=204)
def delete_doctor(id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    d = _get(db, id)
    if db.scalar(select(func.count()).select_from(Appointment).where(Appointment.doctor_id == id)):
        raise HTTPException(409, "Impossible de supprimer : ce médecin a des rendez-vous. Désactivez plutôt son compte.")
    db.delete(d.user)  # supprime aussi le profil médecin et ses disponibilités
    db.commit()
    return Response(status_code=204)
