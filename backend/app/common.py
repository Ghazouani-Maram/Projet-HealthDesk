import re
from typing import Annotated

from fastapi import HTTPException, Query
from pydantic import AfterValidator
from sqlalchemy import func, select

from .models import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 255 or not EMAIL_RE.match(v):
        raise ValueError("adresse email invalide")
    return v


def _password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("8 caractères minimum")
    if len(v.encode()) > 72:
        raise ValueError("72 octets maximum")
    return v


Email = Annotated[str, AfterValidator(_email)]
Password = Annotated[str, AfterValidator(_password)]


def page_params(page: int = Query(1, ge=1), size: int = Query(8, ge=1, le=100)):
    return page, size


def paginate(db, query, page: int, size: int):
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    return items, total


def like(term: str) -> str:
    return f"%{term.strip()}%"


def ensure_email_free(db, email: str, exclude_id: int | None = None) -> None:
    q = select(User.id).where(User.email == email)
    if exclude_id:
        q = q.where(User.id != exclude_id)
    if db.scalar(q) is not None:
        raise HTTPException(409, "Cet email est déjà utilisé")
