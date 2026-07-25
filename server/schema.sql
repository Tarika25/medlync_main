-- MedLync Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum: user_role
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('doctor', 'patient', 'pharmacy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  phone VARCHAR(50),
  hospital_name VARCHAR(255),
  pharmacy_name VARCHAR(255),
  date_of_birth DATE,
  age INTEGER,
  gender VARCHAR(20),
  is_minor BOOLEAN DEFAULT FALSE,
  parent_account_id UUID REFERENCES users(id),
  relationship_type VARCHAR(50),
  profile_photo_url TEXT,
  patient_unique_id VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospital doctors table
CREATE TABLE IF NOT EXISTS hospital_doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  doctor_name VARCHAR(255),
  prescription_code VARCHAR(50) UNIQUE NOT NULL,
  barcode_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  validity_days INTEGER DEFAULT 7,
  expires_at TIMESTAMPTZ,
  chief_complaint TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  follow_up_date DATE,
  additional_notes TEXT,
  collected_by VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines table
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  refill_count INTEGER DEFAULT 0,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  pharmacy_id UUID NOT NULL REFERENCES users(id),
  dispensed_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: users_public (safe user data for frontend)
CREATE OR REPLACE VIEW users_public AS
SELECT
  id, name, email, role, phone,
  hospital_name, pharmacy_name,
  date_of_birth, age, gender, is_minor,
  parent_account_id, relationship_type,
  profile_photo_url, patient_unique_id,
  created_at
FROM users;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_code ON prescriptions(prescription_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_medicines_prescription_id ON medicines(prescription_id);

CREATE INDEX IF NOT EXISTS idx_transactions_pharmacy_id ON transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_transactions_prescription_id ON transactions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_hospital_user_id ON hospital_doctors(hospital_user_id);

-- ==================== COIMBATORE HOSPITALS DIRECTORY ====================
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL DEFAULT 'Coimbatore',
  type VARCHAR(50) NOT NULL DEFAULT 'hospital',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Coimbatore hospitals
INSERT INTO hospitals (name, city, type) VALUES
('Kovai Medical Center and Hospital (KMCH)', 'Coimbatore', 'hospital'),
('PSG Institute of Medical Sciences & Research', 'Coimbatore', 'hospital'),
('Coimbatore Medical College Hospital', 'Coimbatore', 'hospital'),
('Sri Ramakrishna Hospital', 'Coimbatore', 'hospital'),
('Ganga Medical Centre & Hospital', 'Coimbatore', 'hospital'),
('KG Hospital', 'Coimbatore', 'hospital'),
('Gem Hospital', 'Coimbatore', 'hospital'),
('Aravind Eye Hospital', 'Coimbatore', 'hospital'),
('Royal Care Super Specialty Hospital', 'Coimbatore', 'hospital'),
('VGM Hospital', 'Coimbatore', 'hospital'),
('SIMS Hospital', 'Coimbatore', 'hospital'),
('Renai Medicity', 'Coimbatore', 'hospital'),
('Dr. Agarwals Eye Hospital', 'Coimbatore', 'hospital'),
('Lotus Eye Hospital', 'Coimbatore', 'hospital'),
('Sankara Eye Hospital', 'Coimbatore', 'hospital'),
('Ashwin Hospital', 'Coimbatore', 'hospital'),
('Vedanayagam Hospital', 'Coimbatore', 'hospital'),
('Navarathna Hospital', 'Coimbatore', 'hospital'),
('Sarvamangala Hospital', 'Coimbatore', 'hospital'),
('Noble Hospital', 'Coimbatore', 'hospital'),
('KMC Speciality Hospital', 'Coimbatore', 'hospital'),
('Rathna Nursing Home', 'Coimbatore', 'hospital'),
('Shree Hospital', 'Coimbatore', 'hospital'),
('Sugam Hospital', 'Coimbatore', 'hospital'),
('Matha Hospital', 'Coimbatore', 'hospital'),
('Premier Hospital', 'Coimbatore', 'hospital'),
('Rangadore Memorial Hospital', 'Coimbatore', 'hospital'),
('Kovai Kidney Centre', 'Coimbatore', 'hospital'),
('ESI Hospital', 'Coimbatore', 'hospital'),
('Bhavani Hospital', 'Coimbatore', 'hospital'),
('Sowmya Hospital', 'Coimbatore', 'hospital'),
('Abirami Hospital', 'Coimbatore', 'hospital'),
('Nalam Hospital', 'Coimbatore', 'hospital'),
('Sree Renga Hospital', 'Coimbatore', 'hospital'),
('Janatha Hospital', 'Coimbatore', 'hospital'),
('Karuna Hospital', 'Coimbatore', 'hospital'),
('Sathya Hospital', 'Coimbatore', 'hospital'),
('SSM Hospital', 'Coimbatore', 'hospital'),
('Devi Hospital', 'Coimbatore', 'hospital'),
('Rathinam Hospital', 'Coimbatore', 'hospital'),
('Lakshmi Hospital', 'Coimbatore', 'hospital'),
('Senthil Multi Speciality Hospital', 'Coimbatore', 'hospital'),
('Neurocity Brain & Spine Centre', 'Coimbatore', 'hospital'),
('Karpagam Medical College Hospital', 'Coimbatore', 'hospital'),
('Poonthottam Medical Centre', 'Coimbatore', 'hospital'),
('Vijaya Hospital', 'Coimbatore', 'hospital'),
('Medindia Hospitals', 'Coimbatore', 'hospital'),
('Aishwaryam Hospital', 'Coimbatore', 'hospital'),
('Raja Hospital', 'Coimbatore', 'hospital'),
('Sheela Hospital', 'Coimbatore', 'hospital')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);

