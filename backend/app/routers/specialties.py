from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..common import like, page_params, paginate
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import Doctor, Specialty, User

router = APIRouter(prefix="/specialties", tags=["Spécialités"])


class SpecialtyIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None


def out(s: Specialty, doctors_count: int = 0):
    return {"id": s.id, "name": s.name, "description": s.description, "doctorsCount": doctors_count}


def _get(db, id):
    s = db.get(Specialty, id)
    if not s:
        raise HTTPException(404, "Spécialité introuvable")
    return s


def _name_free(db, name, exclude_id=None):
    q = select(Specialty.id).where(func.lower(Specialty.name) == name.strip().lower())
    if exclude_id:
        q = q.where(Specialty.id != exclude_id)
    if db.scalar(q) is not None:
        raise HTTPException(409, "Cette spécialité existe déjà")


@router.get("")
def list_specialties(search: str = "", pg=Depends(page_params), db: Session = Depends(get_db),
                     _: User = Depends(current_user)):
    q = select(Specialty).where(Specialty.name.ilike(like(search))).order_by(Specialty.name)
    items, total = paginate(db, q, *pg)
    counts = dict(db.execute(select(Doctor.specialty_id, func.count()).group_by(Doctor.specialty_id)).all())
    return {"items": [out(s, counts.get(s.id, 0)) for s in items], "total": total}


@router.post("", status_code=201)
def create_specialty(body: SpecialtyIn, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    _name_free(db, body.name)
    s = Specialty(name=body.name.strip(), description=body.description)
    db.add(s)
    db.commit()
    return out(s)


@router.put("/{id}")
def update_specialty(id: int, body: SpecialtyIn, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    s = _get(db, id)
    _name_free(db, body.name, id)
    s.name, s.description = body.name.strip(), body.description
    db.commit()
    return out(s)


@router.delete("/{id}", status_code=204)
def delete_specialty(id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("ADMIN"))):
    s = _get(db, id)
    if db.scalar(select(func.count()).select_from(Doctor).where(Doctor.specialty_id == id)):
        raise HTTPException(409, "Impossible de supprimer : des médecins sont rattachés à cette spécialité")  # RG7
    db.delete(s)
    db.commit()
    return Response(status_code=204)
