import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import current_user
from ..models import Appointment, Document, Patient, User
from ..serializers import document_out
from ..common import page_params, paginate

router = APIRouter(prefix="/documents", tags=["Documents"])

# RG6 : le type réel est déterminé par la signature du fichier, pas par l'en-tête envoyé par le client
SIGNATURES = [
    (b"%PDF-", "application/pdf", ".pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
]
UPLOAD_DIR = Path(settings.upload_dir)


def _can_access_patient(db: Session, user: User, patient_id: int) -> bool:
    if user.role == "ADMIN":
        return True
    if user.role == "PATIENT":
        return user.patient.id == patient_id
    return db.scalar(select(Appointment.id).where(
        Appointment.doctor_id == user.doctor.id, Appointment.patient_id == patient_id).limit(1)) is not None


def _get_accessible(db: Session, user: User, id: int) -> Document:
    d = db.get(Document, id)
    if not d:
        raise HTTPException(404, "Document introuvable")
    if not _can_access_patient(db, user, d.patient_id):
        raise HTTPException(403, "Accès refusé à ce document")
    return d


@router.get("")
def list_documents(patientId: int | None = None, pg=Depends(page_params), db: Session = Depends(get_db),
                   user: User = Depends(current_user)):
    q = select(Document).order_by(Document.created_at.desc())
    if user.role == "PATIENT":
        q = q.where(Document.patient_id == user.patient.id)
    elif user.role == "DOCTOR":
        q = q.where(Document.patient_id.in_(select(Appointment.patient_id).where(Appointment.doctor_id == user.doctor.id)))
    if patientId and user.role != "PATIENT":
        q = q.where(Document.patient_id == patientId)
    items, total = paginate(db, q, *pg)
    return {"items": [document_out(d) for d in items], "total": total}


@router.post("", status_code=201)
def upload_document(
    title: str = Form(..., min_length=1, max_length=150),
    file: UploadFile = File(...),
    patientId: int | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient_id = user.patient.id if user.role == "PATIENT" else patientId
    if not patient_id or not db.get(Patient, patient_id):
        raise HTTPException(422, "Sélectionnez le patient concerné")
    if not _can_access_patient(db, user, patient_id):
        raise HTTPException(403, "Ce patient n'est pas suivi par vous")

    limit = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"Fichier trop volumineux ({settings.max_upload_mb} Mo maximum)")
    kind = next(((mime, ext) for sig, mime, ext in SIGNATURES if data.startswith(sig)), None)
    if not kind:
        raise HTTPException(415, "Format non accepté. Utilisez un PDF, un PNG ou un JPEG.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored = f"{uuid.uuid4().hex}{kind[1]}"  # nom aléatoire : jamais le nom d'origine
    (UPLOAD_DIR / stored).write_bytes(data)
    doc = Document(patient_id=patient_id, uploaded_by=user.id, title=title.strip(),
                   original_filename=os.path.basename(file.filename or "document")[:255],
                   content_type=kind[0], size_bytes=len(data), storage_path=stored)
    db.add(doc)
    db.commit()
    return document_out(doc)


@router.get("/{id}/file")
def download_document(id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = _get_accessible(db, user, id)
    path = UPLOAD_DIR / d.storage_path
    if not path.is_file():
        raise HTTPException(404, "Fichier introuvable sur le serveur")
    return FileResponse(path, media_type=d.content_type, filename=d.original_filename,
                        content_disposition_type="inline")


@router.delete("/{id}", status_code=204)
def delete_document(id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = _get_accessible(db, user, id)
    if user.role != "ADMIN" and d.uploaded_by != user.id:
        raise HTTPException(403, "Seul l'auteur du dépôt ou un administrateur peut supprimer ce document")
    (UPLOAD_DIR / d.storage_path).unlink(missing_ok=True)
    db.delete(d)
    db.commit()
    return Response(status_code=204)
