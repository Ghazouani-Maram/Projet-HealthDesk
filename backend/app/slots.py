from datetime import date, datetime, time, timedelta

from sqlalchemy import select

from .models import Appointment, Availability

SLOT_MINUTES = 30  # RG3


def free_slots(db, doctor_id: int, day: date) -> list[str]:
    """Créneaux libres d'un médecin pour un jour : plages de disponibilité, moins les rendez-vous pris et le passé."""
    availabilities = db.scalars(
        select(Availability).where(Availability.doctor_id == doctor_id, Availability.weekday == day.isoweekday())
    ).all()
    start_day = datetime.combine(day, time.min)
    taken = set(db.scalars(
        select(Appointment.starts_at).where(
            Appointment.doctor_id == doctor_id, Appointment.status != "CANCELLED",
            Appointment.starts_at >= start_day, Appointment.starts_at < start_day + timedelta(days=1))
    ))
    now = datetime.now()
    step = timedelta(minutes=SLOT_MINUTES)
    result = set()
    for av in availabilities:
        cur, end = datetime.combine(day, av.start_time), datetime.combine(day, av.end_time)
        while cur + step <= end:
            if cur > now and cur not in taken:
                result.add(cur.strftime("%H:%M"))
            cur += step
    return sorted(result)
