from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from ..common import like, page_params, paginate
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import Appointment, Doctor, Patient, User
from ..serializers import appointment_out
from ..slots import free_slots

router = APIRouter(prefix="/appointments", tags=["Rendez-vous"])
Status = Literal["PENDING", "CONFIRMED", "CANCELLED", "DONE"]
TRANSITIONS = {"PENDING": {"CONFIRMED", "CANCELLED"}, "CONFIRMED": {"DONE", "CANCELLED"}}
SLOT_TAKEN = "Ce créneau n'est pas disponible. Choisissez-en un autre."


class AppointmentIn(BaseModel):
    doctorId: int
    patientId: int | None = None
    startsAt: datetime
    reason: str = Field(min_length=3, max_length=300)


class StatusIn(BaseModel):
    status: Status


def _visible(db: Session, user: User, id: int) -> Appointment:
    """Rendez-vous accessible à l'utilisateur (RG4, RG5), sinon 404."""
    a = db.get(Appointment, id)
    if a:
        if user.role == "PATIENT" and a.patient_id != user.patient.id:
            a = None
        elif user.role == "DOCTOR" and a.doctor_id != user.doctor.id:
            a = None
    if not a:
        raise HTTPException(404, "Rendez-vous introuvable")
    return a


@router.get("")
def list_appointments(
    status: Status | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    search: str = "",
    sort: str = "startsAt",
    pg=Depends(page_params),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    doc_user, pat_user = aliased(User), aliased(User)
    q = (select(Appointment)
         .join(Doctor, Appointment.doctor_id == Doctor.id).join(doc_user, Doctor.user_id == doc_user.id)
         .join(Patient, Appointment.patient_id == Patient.id).join(pat_user, Patient.user_id == pat_user.id))
    if user.role == "PATIENT":
        q = q.where(Appointment.patient_id == user.patient.id)
    elif user.role == "DOCTOR":
        q = q.where(Appointment.doctor_id == user.doctor.id)
    if status:
        q = q.where(Appointment.status == status)
    if date_from:
        q = q.where(Appointment.starts_at >= datetime.combine(date_from, time.min))
    if date_to:
        q = q.where(Appointment.starts_at < datetime.combine(date_to + timedelta(days=1), time.min))
    if search.strip():
        q = q.where(or_(doc_user.name.ilike(like(search)), pat_user.name.ilike(like(search))))
    items, total = paginate(db, q.order_by(Appointment.starts_at), *pg)
    return {"items": [appointment_out(a) for a in items], "total": total}


@router.post("", status_code=201)
def create_appointment(body: AppointmentIn, db: Session = Depends(get_db),
                       user: User = Depends(require_roles("PATIENT", "ADMIN"))):
    if user.role == "PATIENT":
        patient_id = user.patient.id
    elif body.patientId:
        patient_id = body.patientId
    else:
        raise HTTPException(422, "Le patient est obligatoire")
    if not db.get(Doctor, body.doctorId):
        raise HTTPException(404, "Médecin introuvable")
    if not db.get(Patient, patient_id):
        raise HTTPException(404, "Patient introuvable")

    starts = body.startsAt.replace(tzinfo=None, second=0, microsecond=0)
    if starts <= datetime.now():
        raise HTTPException(422, "Le rendez-vous doit être dans le futur")
    if starts.strftime("%H:%M") not in free_slots(db, body.doctorId, starts.date()):  # RG2, RG3
        raise HTTPException(409, SLOT_TAKEN)

    a = Appointment(doctor_id=body.doctorId, patient_id=patient_id, starts_at=starts,
                    reason=body.reason.strip(), status="PENDING")
    db.add(a)
    try:
        db.commit()
    except IntegrityError:  # deux réservations simultanées : l'index unique (RG1) tranche
        db.rollback()
        raise HTTPException(409, SLOT_TAKEN)
    return appointment_out(a)


@router.patch("/{id}/status")
def change_status(id: int, body: StatusIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    a = _visible(db, user, id)
    if user.role == "PATIENT" and body.status != "CANCELLED":
        raise HTTPException(403, "Un patient peut seulement annuler son rendez-vous")
    if body.status not in TRANSITIONS.get(a.status, set()):
        raise HTTPException(409, "Ce changement de statut n'est pas autorisé")
    a.status = body.status
    db.commit()
    return appointment_out(a)


@router.delete("/{id}", status_code=204)
def delete_appointment(id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    a = db.get(Appointment, id)
    if not a:
        raise HTTPException(404, "Rendez-vous introuvable")
    db.delete(a)
    db.commit()
    return Response(status_code=204)
