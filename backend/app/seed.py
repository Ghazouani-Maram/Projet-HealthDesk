"""Données de démonstration, créées uniquement si la base est vide."""
from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Appointment, Availability, Doctor, Patient, Specialty, User
from .security import hash_password

ADMIN_PASSWORD = "Admin123!"
DEMO_PASSWORD = "Demo1234!"


def seed(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(User)):
        return
    admin_hash, demo_hash = hash_password(ADMIN_PASSWORD), hash_password(DEMO_PASSWORD)
    db.add(User(name="Administrateur", email="admin@demo.tn", password_hash=admin_hash, role="ADMIN"))

    specs = {n: Specialty(name=n, description=d) for n, d in [
        ("Médecine générale", "Suivi et consultations courantes"), ("Cardiologie", "Cœur et système cardiovasculaire"),
        ("Dermatologie", "Peau, cheveux et ongles"), ("Pédiatrie", "Santé de l'enfant")]}
    db.add_all(specs.values())

    doctors = []
    for name, email, phone, spec in [
        ("Dr Salma Ben Ali", "medecin@demo.tn", "71 000 001", "Médecine générale"),
        ("Dr Karim Trabelsi", "k.trabelsi@demo.tn", "71 000 002", "Cardiologie"),
        ("Dr Ines Gharbi", "i.gharbi@demo.tn", "71 000 003", "Dermatologie"),
        ("Dr Mehdi Jlassi", "m.jlassi@demo.tn", "71 000 004", "Pédiatrie"),
        ("Dr Rania Mansour", "r.mansour@demo.tn", "71 000 005", "Cardiologie")]:
        d = Doctor(specialty=specs[spec], phone=phone)
        # Disponibilités : du lundi au vendredi, 09h-12h et 14h-16h
        d.availabilities = [Availability(weekday=w, start_time=s, end_time=e)
                            for w in range(1, 6) for s, e in [(time(9), time(12)), (time(14), time(16))]]
        db.add(User(name=name, email=email, password_hash=demo_hash, role="DOCTOR", doctor=d))
        doctors.append(d)

    patients = []
    for name, email, phone in [("Yasmine Khelifi", "patient@demo.tn", "20 111 001"), ("Omar Bouzid", "o.bouzid@demo.tn", "20 111 002"),
                               ("Leila Chaabane", "l.chaabane@demo.tn", "20 111 003"), ("Sami Hamdi", "s.hamdi@demo.tn", "20 111 004")]:
        p = Patient(phone=phone)
        db.add(User(name=name, email=email, password_hash=demo_hash, role="PATIENT", patient=p))
        patients.append(p)

    def at(days, hour, minute=0):
        return (datetime.now() + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)

    for doc, pat, when, reason, status in [
        (0, 0, at(0, 9), "Bilan annuel", "CONFIRMED"), (0, 1, at(0, 10, 30), "Maux de dos persistants", "PENDING"),
        (1, 2, at(0, 14), "Contrôle tension", "CONFIRMED"), (0, 2, at(1, 9, 30), "Renouvellement ordonnance", "PENDING"),
        (2, 0, at(2, 11), "Acné", "PENDING"), (3, 3, at(2, 15), "Vaccin de rappel", "CONFIRMED"),
        (0, 0, at(3, 10), "Suivi fatigue", "CONFIRMED"), (1, 1, at(-3, 9), "Palpitations", "DONE"),
        (0, 1, at(-5, 14, 30), "Certificat médical", "DONE"), (4, 2, at(-1, 10), "Électrocardiogramme", "CANCELLED")]:
        db.add(Appointment(doctor=doctors[doc], patient=patients[pat], starts_at=when, reason=reason, status=status))
    db.commit()
