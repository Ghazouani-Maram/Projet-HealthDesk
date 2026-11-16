from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..common import page_params, paginate
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import Appointment, Doctor, Review, User
from ..serializers import review_out

router = APIRouter(tags=["Avis"])

NEEDS_VISIT = "NEEDS_VISIT"
ALREADY = "ALREADY_REVIEWED"
CAN = "CAN_REVIEW"


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def _strip(cls, v):
        return (v or "").strip() or None


def _doctor(db: Session, id: int) -> Doctor:
    d = db.get(Doctor, id)
    if not d:
        raise HTTPException(404, "Médecin introuvable")
    return d


def review_state(db: Session, user: User, doctor_id: int) -> str | None:
    """RG8 : un patient peut laisser un avis s'il a eu un rendez-vous terminé avec ce médecin, une seule fois."""
    if user.role != "PATIENT" or not user.patient:
        return None
    pid = user.patient.id
    if db.scalar(select(Review.id).where(Review.doctor_id == doctor_id, Review.patient_id == pid)):
        return ALREADY
    done = db.scalar(select(Appointment.id).where(
        Appointment.doctor_id == doctor_id, Appointment.patient_id == pid, Appointment.status == "DONE").limit(1))
    return CAN if done else NEEDS_VISIT


def summary(db: Session, doctor_id: int) -> dict:
    rows = db.execute(select(Review.rating, func.count()).where(Review.doctor_id == doctor_id)
                      .group_by(Review.rating)).all()
    dist = {i: 0 for i in range(1, 6)}
    dist.update({r: n for r, n in rows})
    count = sum(dist.values())
    avg = round(sum(r * n for r, n in dist.items()) / count, 1) if count else None
    return {"avg": avg, "count": count, "distribution": dist}


@router.get("/doctors/{id}/reviews")
def list_reviews(id: int, pg=Depends(page_params), db: Session = Depends(get_db), user: User = Depends(current_user)):
    _doctor(db, id)
    q = select(Review).where(Review.doctor_id == id).order_by(Review.created_at.desc(), Review.id.desc())
    items, total = paginate(db, q, *pg)
    mine = user.patient.id if user.role == "PATIENT" and user.patient else None
    return {
        "items": [review_out(r, mine=r.patient_id == mine) for r in items], "total": total,
        "summary": summary(db, id), "reviewState": review_state(db, user, id),
    }


@router.post("/doctors/{id}/reviews", status_code=201)
def create_review(id: int, body: ReviewIn, db: Session = Depends(get_db), user: User = Depends(require_roles("PATIENT"))):
    _doctor(db, id)
    state = review_state(db, user, id)
    if state == ALREADY:
        raise HTTPException(409, "Vous avez déjà donné votre avis sur ce médecin")
    if state != CAN:
        raise HTTPException(403, "Vous pouvez donner votre avis après une consultation terminée avec ce médecin")
    r = Review(doctor_id=id, patient_id=user.patient.id, rating=body.rating, comment=body.comment)
    db.add(r)
    try:
        db.commit()
    except IntegrityError:  # deux envois simultanés : la contrainte unique tranche
        db.rollback()
        raise HTTPException(409, "Vous avez déjà donné votre avis sur ce médecin")
    return review_out(r, mine=True)


@router.delete("/reviews/{id}", status_code=204)
def delete_review(id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("PATIENT", "ADMIN"))):
    r = db.get(Review, id)
    if not r or (user.role == "PATIENT" and r.patient_id != user.patient.id):
        raise HTTPException(404, "Avis introuvable")
    db.delete(r)
    db.commit()
    return Response(status_code=204)
