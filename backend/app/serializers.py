"""Formats JSON attendus par le frontend (contrat décrit dans le README du frontend)."""


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def user_out(u):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active}


def me_out(u):
    return {
        "id": u.id, "name": u.name, "email": u.email, "role": u.role,
        "doctorId": u.doctor.id if u.doctor else None,
        "patientId": u.patient.id if u.patient else None,
    }


def mask_name(name):
    """« Yasmine Khelifi » -> « Yasmine K. » : l'auteur d'un avis n'est pas identifié en entier."""
    parts = name.split()
    return f"{parts[0]} {parts[-1][0].upper()}." if len(parts) > 1 else name


def doctor_out(d):
    ratings = [r.rating for r in d.reviews]
    return {
        "id": d.id, "name": d.user.name, "email": d.user.email, "phone": d.phone,
        "specialty": {"id": d.specialty.id, "name": d.specialty.name},
        "rating": {"avg": round(sum(ratings) / len(ratings), 1) if ratings else None, "count": len(ratings)},
    }


def review_out(r, mine=False):
    return {
        "id": r.id, "rating": r.rating, "comment": r.comment, "createdAt": iso(r.created_at),
        "author": mask_name(r.patient.user.name), "mine": mine,
    }


def patient_out(p):
    return {
        "id": p.id, "name": p.user.name, "email": p.user.email, "phone": p.phone,
        "birthDate": p.birth_date.isoformat() if p.birth_date else None,
    }


def appointment_out(a):
    return {
        "id": a.id, "startsAt": iso(a.starts_at), "reason": a.reason, "status": a.status,
        "doctor": doctor_out(a.doctor),
        "patient": {"id": a.patient.id, "name": a.patient.user.name, "phone": a.patient.phone,
                    "birthDate": a.patient.birth_date.isoformat() if a.patient.birth_date else None},
    }


def document_out(d):
    return {
        "id": d.id, "title": d.title, "size": d.size_bytes, "createdAt": iso(d.created_at),
        "uploadedById": d.uploaded_by,
        "patient": {"id": d.patient.id, "name": d.patient.user.name},
    }
