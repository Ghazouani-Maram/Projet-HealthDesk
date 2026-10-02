from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..common import Email, Password, ensure_email_free, like, page_params, paginate
from ..db import get_db
from ..deps import require_roles
from ..models import Appointment, Patient, User
from ..security import hash_password
from ..serializers import patient_out

router = APIRouter(prefix="/patients", tags=["Patients"])


class PatientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: Email
    phone: str | None = Field(None, max_length=30)
    birthDate: date | None = None

    @field_validator("birthDate", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class PatientCreate(PatientIn):
    password: Password


def _get(db, id) -> Patient:
    p = db.get(Patient, id)
    if not p:
        raise HTTPException(404, "Patient introuvable")
    return p


@router.get("")
def list_patients(search: str = "", pg=Depends(page_params), db: Session = Depends(get_db),
                  user: User = Depends(require_roles("ADMIN", "DOCTOR"))):
    q = select(Patient).join(User, Patient.user_id == User.id).where(
        User.name.ilike(like(search)) | User.email.ilike(like(search))).order_by(User.name)
    if user.role == "DOCTOR":  # RG5 : un médecin ne voit que ses patients
        q = q.where(Patient.id.in_(select(Appointment.patient_id).where(Appointment.doctor_id == user.doctor.id)))
    items, total = paginate(db, q, *pg)
    return {"items": [patient_out(p) for p in items], "total": total}


@router.post("", status_code=201)
def create_patient(body: PatientCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    ensure_email_free(db, body.email)
    p = Patient(phone=body.phone or None, birth_date=body.birthDate)
    db.add(User(name=body.name.strip(), email=body.email, password_hash=hash_password(body.password),
                role="PATIENT", patient=p))
    db.commit()
    return patient_out(p)


@router.put("/{id}")
def update_patient(id: int, body: PatientIn, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    p = _get(db, id)
    ensure_email_free(db, body.email, p.user_id)
    p.user.name, p.user.email = body.name.strip(), body.email
    p.phone, p.birth_date = body.phone or None, body.birthDate
    db.commit()
    db.refresh(p)
    return patient_out(p)


@router.delete("/{id}", status_code=204)
def delete_patient(id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    p = _get(db, id)
    if db.scalar(select(func.count()).select_from(Appointment).where(Appointment.patient_id == id)):
        raise HTTPException(409, "Impossible de supprimer : ce patient a des rendez-vous. Désactivez plutôt son compte.")
    db.delete(p.user)
    db.commit()
    return Response(status_code=204)
