from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_roles
from ..models import Appointment, Doctor, Patient, Specialty, User

router = APIRouter(prefix="/stats", tags=["Tableau de bord"])


@router.get("")
def stats(db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    count = lambda model: db.scalar(select(func.count()).select_from(model))
    today = datetime.combine(datetime.now().date(), time.min)
    by_status = {"PENDING": 0, "CONFIRMED": 0, "CANCELLED": 0, "DONE": 0}
    by_status.update(dict(db.execute(select(Appointment.status, func.count()).group_by(Appointment.status)).all()))
    appts_today = db.scalar(select(func.count()).select_from(Appointment).where(
        Appointment.starts_at >= today, Appointment.starts_at < today + timedelta(days=1),
        Appointment.status != "CANCELLED"))
    top = db.execute(
        select(Specialty.name, func.count(Appointment.id).label("n"))
        .join(Doctor, Doctor.specialty_id == Specialty.id).join(Appointment, Appointment.doctor_id == Doctor.id)
        .where(Appointment.status != "CANCELLED").group_by(Specialty.name).order_by(func.count(Appointment.id).desc()).limit(5)
    ).all()
    return {
        "patients": count(Patient), "doctors": count(Doctor), "specialties": count(Specialty),
        "appointmentsToday": appts_today, "appointmentsPending": by_status["PENDING"],
        "byStatus": by_status, "topSpecialties": [{"name": n, "count": c} for n, c in top],
    }
