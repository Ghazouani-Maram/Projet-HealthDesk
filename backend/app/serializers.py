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


def doctor_out(d):
    return {
        "id": d.id, "name": d.user.name, "email": d.user.email, "phone": d.phone,
        "specialty": {"id": d.specialty.id, "name": d.specialty.name},
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
        "patient": {"id": a.patient.id, "name": a.patient.user.name},
    }


def document_out(d):
    return {
        "id": d.id, "title": d.title, "size": d.size_bytes, "createdAt": iso(d.created_at),
        "uploadedById": d.uploaded_by,
        "patient": {"id": d.patient.id, "name": d.patient.user.name},
    }
