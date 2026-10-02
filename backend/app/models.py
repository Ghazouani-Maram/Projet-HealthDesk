"""Modèle de données : identique à db/schema.sql et à la note d'architecture (section 4)."""
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import (BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index,
                        Integer, SmallInteger, String, Text, Time, text)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

ID = BigInteger().with_variant(Integer, "sqlite")  # auto-incrément aussi sous SQLite


class Specialty(Base):
    __tablename__ = "specialties"
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('ADMIN', 'DOCTOR', 'PATIENT')", name="ck_users_role"),)
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    doctor: Mapped[Optional["Doctor"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    patient: Mapped[Optional["Patient"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Doctor(Base):
    __tablename__ = "doctors"
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    user_id: Mapped[int] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialty_id: Mapped[int] = mapped_column(ID, ForeignKey("specialties.id", ondelete="RESTRICT"))
    phone: Mapped[Optional[str]] = mapped_column(String(30))

    user: Mapped[User] = relationship(back_populates="doctor")
    specialty: Mapped[Specialty] = relationship()
    availabilities: Mapped[list["Availability"]] = relationship(cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    user_id: Mapped[int] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    birth_date: Mapped[Optional[date]] = mapped_column(Date)

    user: Mapped[User] = relationship(back_populates="patient")
    documents: Mapped[list["Document"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class Availability(Base):
    __tablename__ = "availabilities"
    __table_args__ = (
        CheckConstraint("weekday BETWEEN 1 AND 7", name="ck_availability_weekday"),
        CheckConstraint("end_time > start_time", name="ck_availability_hours"),
    )
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ID, ForeignKey("doctors.id", ondelete="CASCADE"))
    weekday: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint("status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'DONE')", name="ck_appointments_status"),
        # RG1 : pas de double réservation d'un même créneau (hors rendez-vous annulés)
        Index("uq_appointment_slot", "doctor_id", "starts_at", unique=True,
              postgresql_where=text("status <> 'CANCELLED'"), sqlite_where=text("status <> 'CANCELLED'")),
        Index("idx_appointments_patient", "patient_id", "starts_at"),
    )
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ID, ForeignKey("doctors.id", ondelete="RESTRICT"))
    patient_id: Mapped[int] = mapped_column(ID, ForeignKey("patients.id", ondelete="RESTRICT"))
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    reason: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(10), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    doctor: Mapped[Doctor] = relationship()
    patient: Mapped[Patient] = relationship()


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(ID, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ID, ForeignKey("patients.id", ondelete="CASCADE"))
    uploaded_by: Mapped[Optional[int]] = mapped_column(ID, ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(150))
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    patient: Mapped[Patient] = relationship(back_populates="documents")
