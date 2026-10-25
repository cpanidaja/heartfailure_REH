-- MySQL 8 schema foundation for HF Clinic.
-- Apply only to a new, private database. This file contains no patient data.
-- All patient data access must go through the authenticated API service.

CREATE DATABASE IF NOT EXISTS hf_clinic
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE hf_clinic;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hn VARCHAR(40) NOT NULL,
  display_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_hn (hn)
) ENGINE=InnoDB;

-- One row represents one legacy sheet row / service record.
-- payload preserves source columns while API calculations are migrated.
CREATE TABLE IF NOT EXISTS clinical_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_sheet VARCHAR(100) NOT NULL,
  source_row_id VARCHAR(100) NULL,
  patient_id BIGINT UNSIGNED NULL,
  encounter_date DATE NULL,
  payload JSON NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clinical_source_row (source_sheet, source_row_id),
  KEY ix_clinical_patient_date (patient_id, encounter_date),
  KEY ix_clinical_sheet_date (source_sheet, encounter_date),
  CONSTRAINT fk_clinical_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_clinical_user FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Store only hashed bearer tokens; never store a raw session token.
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token_hash (token_hash),
  KEY ix_sessions_user_expiry (user_id, expires_at),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  source_sheet VARCHAR(100) NULL,
  record_id BIGINT UNSIGNED NULL,
  before_state JSON NULL,
  after_state JSON NULL,
  request_id VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_record_time (source_sheet, record_id, created_at),
  KEY ix_audit_actor_time (actor_user_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
