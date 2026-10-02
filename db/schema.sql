-- Schéma PostgreSQL : plateforme de gestion de rendez-vous médicaux
-- Conforme à la note d'architecture (section 4)

CREATE TABLE specialties (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('ADMIN', 'DOCTOR', 'PATIENT')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE doctors (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty_id BIGINT NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  phone        VARCHAR(30)
);

CREATE TABLE patients (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone      VARCHAR(30),
  birth_date DATE
);

CREATE TABLE availabilities (
  id         BIGSERIAL PRIMARY KEY,
  doctor_id  BIGINT   NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  weekday    SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME     NOT NULL,
  end_time   TIME     NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE appointments (
  id         BIGSERIAL PRIMARY KEY,
  doctor_id  BIGINT       NOT NULL REFERENCES doctors(id)  ON DELETE RESTRICT,
  patient_id BIGINT       NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  starts_at  TIMESTAMP    NOT NULL,
  reason     VARCHAR(300) NOT NULL,
  status     VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
             CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'DONE')),
  created_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- RG1 : un médecin ne peut pas avoir deux rendez-vous non annulés au même instant
CREATE UNIQUE INDEX uq_appointment_slot
  ON appointments (doctor_id, starts_at) WHERE status <> 'CANCELLED';
CREATE INDEX idx_appointments_patient ON appointments (patient_id, starts_at);

CREATE TABLE documents (
  id                BIGSERIAL PRIMARY KEY,
  patient_id        BIGINT       NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by       BIGINT       REFERENCES users(id) ON DELETE SET NULL,
  title             VARCHAR(150) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  content_type      VARCHAR(100) NOT NULL,
  size_bytes        INTEGER      NOT NULL,
  storage_path      VARCHAR(255) NOT NULL UNIQUE,
  created_at        TIMESTAMP    NOT NULL DEFAULT now()
);
