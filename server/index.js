import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'medlync-secret-key-change-in-production';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://medlync.onrender.com'
  ],
  credentials: true
}));
app.use(express.json());

// File upload config
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Helper: generate patient unique ID
async function generatePatientUniqueId() {
  const year = new Date().getFullYear();
  const { rows } = await pool.query("SELECT COALESCE(MAX(SUBSTRING(patient_unique_id, 9)::integer), 0) + 1 AS next_id FROM users WHERE patient_unique_id LIKE $1", [`PAT-${year}-%`]);
  const nextId = String(rows[0].next_id).padStart(4, '0');
  return `PAT-${year}-${nextId}`;
}

// Helper: generate prescription code
async function generatePrescriptionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let exists = true;
  while (exists) {
    code = 'RX';
    for (let i = 0; i < 10; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const { rows } = await pool.query('SELECT 1 FROM prescriptions WHERE prescription_code = $1', [code]);
    exists = rows.length > 0;
  }
  return code;
}

// Helper: generate barcode ID
function generateBarcodeId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let bc = 'BC';
  for (let i = 0; i < 12; i++) bc += chars.charAt(Math.floor(Math.random() * chars.length));
  return bc;
}

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, phone, hospital_name, pharmacy_name, date_of_birth, profile_photo_url, parent_account_id, relationship_type } = req.body;

  try {
    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    let age = null;
    let is_minor = false;
    let patient_unique_id = null;
    if (date_of_birth && role === 'patient') {
      const birth = new Date(date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      is_minor = age < 18;
      if (!is_minor) {
        patient_unique_id = await generatePatientUniqueId();
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, hospital_name, pharmacy_name, date_of_birth, age, is_minor, profile_photo_url, patient_unique_id, parent_account_id, relationship_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, name, email, role, phone, hospital_name, pharmacy_name, date_of_birth, age, is_minor, profile_photo_url, patient_unique_id, parent_account_id, relationship_type`,
      [id, name, email, password_hash, role, phone, hospital_name || null, pharmacy_name || null, date_of_birth || null, age, is_minor, profile_photo_url || null, patient_unique_id, parent_account_id || null, relationship_type || null]
    );

    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PRESCRIPTION ROUTES ====================

// Create prescription
app.post('/api/prescriptions/create', authenticate, async (req, res) => {
  const { patient_id, medicines, doctor_name, validity_days, chief_complaint, symptoms, diagnosis, follow_up_date, additional_notes } = req.body;
  const doctor_id = req.user.id;

  try {
    const prescription_code = await generatePrescriptionCode();
    const barcode_id = generateBarcodeId();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + (validity_days || 7));

    const { rows } = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, doctor_name, prescription_code, barcode_id, validity_days, expires_at, chief_complaint, symptoms, diagnosis, follow_up_date, additional_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [patient_id, doctor_id, doctor_name || null, prescription_code, barcode_id, validity_days || 7, expires_at, chief_complaint || null, symptoms || null, diagnosis || null, follow_up_date || null, additional_notes || null]
    );

    const prescription = rows[0];

    // Insert medicines
    for (const med of medicines) {
      let end_date = null;
      if (med.duration) {
        const durationMatch = med.duration.match(/(\d+)/);
        if (durationMatch) {
          end_date = new Date();
          end_date.setDate(end_date.getDate() + parseInt(durationMatch[1]) * 30);
        }
      }
      await pool.query(
        `INSERT INTO medicines (prescription_id, name, dosage, frequency, duration, refill_count, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [prescription.id, med.name, med.dosage, med.frequency, med.duration, med.refill_count || 0, end_date]
      );
    }

    res.json({ prescription });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List prescriptions (doctor gets all, patient/pharmacy get relevant)
app.get('/api/prescriptions/list', authenticate, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'doctor') {
      query = `SELECT p.*, 
        json_build_object('name', u.name, 'patient_unique_id', u.patient_unique_id, 'profile_photo_url', u.profile_photo_url) AS patient
        FROM prescriptions p 
        LEFT JOIN users u ON p.patient_id = u.id 
        WHERE p.doctor_id = $1 
        ORDER BY p.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'patient') {
      query = `SELECT p.*, 
        json_build_object('name', doc.name, 'hospital_name', doc.hospital_name) AS doctor,
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'dosage', m.dosage, 'frequency', m.frequency, 'duration', m.duration, 'refill_count', m.refill_count, 'end_date', m.end_date)) FROM medicines m WHERE m.prescription_id = p.id) AS medicines
        FROM prescriptions p 
        LEFT JOIN users doc ON p.doctor_id = doc.id 
        WHERE p.patient_id = $1 
        ORDER BY p.created_at DESC`;
      params = [req.user.id];
    } else {
      // Pharmacy sees all active prescriptions
      query = `SELECT p.*, 
        json_build_object('name', u.name, 'patient_unique_id', u.patient_unique_id, 'phone', u.phone, 'profile_photo_url', u.profile_photo_url) AS patient
        FROM prescriptions p 
        LEFT JOIN users u ON p.patient_id = u.id 
        ORDER BY p.created_at DESC`;
      params = [];
    }

    const { rows } = await pool.query(query, params);

    // Add computed fields
    const prescriptions = rows.map(p => {
      const now = new Date();
      const expiresAt = new Date(p.expires_at);
      const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      return {
        ...p,
        is_near_expiry: p.status === 'Active' && diffDays >= 0 && diffDays <= 7,
        is_expired: p.status === 'Expired' || diffDays < 0,
      };
    });

    res.json({ prescriptions });
  } catch (err) {
    console.error('List prescriptions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify prescription by code
app.get('/api/prescriptions/verify', async (req, res) => {
  const { code } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, 
        json_build_object('name', u.name, 'phone', u.phone, 'profile_photo_url', u.profile_photo_url, 'patient_unique_id', u.patient_unique_id) AS patient,
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'dosage', m.dosage, 'frequency', m.frequency, 'duration', m.duration, 'refill_count', m.refill_count, 'end_date', m.end_date)) FROM medicines m WHERE m.prescription_id = p.id) AS medicines
       FROM prescriptions p 
       LEFT JOIN users u ON p.patient_id = u.id 
       WHERE p.prescription_code = $1 OR p.barcode_id = $1`,
      [code]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Prescription not found' });

    const p = rows[0];
    const now = new Date();
    const expiresAt = new Date(p.expires_at);
    const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 && p.status === 'Active') {
      await pool.query('UPDATE prescriptions SET status = $1 WHERE id = $2', ['Expired', p.id]);
      p.status = 'Expired';
    }

    const is_expired = p.status === 'Expired' || diffDays < 0;
    const can_dispense = p.status === 'Active' && !is_expired;

    res.json({
      prescription: {
        ...p,
        is_near_expiry: can_dispense && diffDays <= 7,
        is_expired,
        can_dispense,
      }
    });
  } catch (err) {
    console.error('Verify prescription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patients (for doctor)
app.get('/api/prescriptions/patients', authenticate, async (req, res) => {
  const { search } = req.query;
  try {
    let query;
    let params;
    if (search) {
      query = `SELECT DISTINCT u.id, u.name, u.patient_unique_id, u.phone, u.profile_photo_url
               FROM prescriptions p 
               JOIN users u ON p.patient_id = u.id 
               WHERE p.doctor_id = $1 AND (u.name ILIKE $2 OR u.patient_unique_id ILIKE $2 OR u.phone ILIKE $2)
               LIMIT 20`;
      params = [req.user.id, `%${search}%`];
    } else {
      query = `SELECT DISTINCT u.id, u.name, u.patient_unique_id, u.phone, u.profile_photo_url
               FROM prescriptions p 
               JOIN users u ON p.patient_id = u.id 
               WHERE p.doctor_id = $1
               LIMIT 20`;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json({ patients: rows });
  } catch (err) {
    console.error('Get patients error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FAMILY MEMBER ROUTES ====================

// Get family members
app.get('/api/prescriptions/family', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, date_of_birth, age, is_minor, relationship_type, gender, profile_photo_url, patient_unique_id
       FROM users WHERE parent_account_id = $1`,
      [req.user.id]
    );
    res.json({ members: rows });
  } catch (err) {
    console.error('Get family error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add family member
app.post('/api/prescriptions/add-family', authenticate, async (req, res) => {
  const { name, email, password, date_of_birth, relationship_type, profile_photo_url, gender } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const birth = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    const is_minor = age < 18;
    const patient_unique_id = await generatePatientUniqueId();

    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, date_of_birth, age, is_minor, relationship_type, gender, profile_photo_url, patient_unique_id, parent_account_id)
       VALUES ($1, $2, $3, $4, 'patient', $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, email, role, date_of_birth, age, is_minor, relationship_type, gender, profile_photo_url, patient_unique_id`,
      [id, name, email, password_hash, date_of_birth, age, is_minor, relationship_type, gender || null, profile_photo_url || null, patient_unique_id, req.user.id]
    );

    res.json({ member: rows[0] });
  } catch (err) {
    console.error('Add family error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DOCTOR MANAGEMENT ROUTES ====================

// Get hospital doctors
app.get('/api/prescriptions/doctors', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, specialization, created_at FROM hospital_doctors WHERE hospital_user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json({ doctors: rows });
  } catch (err) {
    console.error('Get doctors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add hospital doctor
app.post('/api/prescriptions/add-doctor', authenticate, async (req, res) => {
  const { name, specialization } = req.body;
  try {
    const id = uuidv4();
    const { rows } = await pool.query(
      'INSERT INTO hospital_doctors (id, hospital_user_id, name, specialization) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, req.user.id, name, specialization || null]
    );
    res.json({ doctor: rows[0] });
  } catch (err) {
    console.error('Add doctor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove hospital doctor
app.post('/api/prescriptions/remove-doctor', authenticate, async (req, res) => {
  const { doctor_id } = req.body;
  try {
    await pool.query('DELETE FROM hospital_doctors WHERE id = $1 AND hospital_user_id = $2', [doctor_id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove doctor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PHARMACY ROUTES ====================

// Dispense prescription
app.post('/api/pharmacy/dispense', authenticate, async (req, res) => {
  const { prescription_code, collected_by } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT id, status FROM prescriptions WHERE prescription_code = $1 OR barcode_id = $1',
      [prescription_code]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prescription not found' });

    const { id: prescription_id, status } = rows[0];
    if (status === 'Used') return res.status(400).json({ error: 'Prescription already dispensed' });
    if (status === 'Expired') return res.status(400).json({ error: 'Prescription has expired' });

    await pool.query(
      'UPDATE prescriptions SET status = $1, collected_by = $2 WHERE id = $3',
      ['Used', collected_by || 'self', prescription_id]
    );

    const txId = uuidv4();
    await pool.query(
      'INSERT INTO transactions (id, prescription_id, pharmacy_id) VALUES ($1, $2, $3)',
      [txId, prescription_id, req.user.id]
    );

    res.json({ success: true, transaction_id: txId });
  } catch (err) {
    console.error('Dispense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transactions
app.get('/api/pharmacy/transactions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.dispensed_at, t.prescription_id, t.pharmacy_id,
        json_build_object('prescription_code', p.prescription_code, 'collected_by', p.collected_by) AS prescriptions
       FROM transactions t
       LEFT JOIN prescriptions p ON t.prescription_id = p.id
       WHERE t.pharmacy_id = $1
       ORDER BY t.dispensed_at DESC`,
      [req.user.id]
    );
    res.json({ transactions: rows });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FILE UPLOAD ====================

app.post('/api/upload/profile-photo', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PATIENT SEARCH & REGISTER (for doctors) ====================

// Search all patients by name, ID, or phone
app.get('/api/patients/search', authenticate, async (req, res) => {
  const { q } = req.query;
  try {
    let query, params;
    if (q && q.trim().length >= 2) {
      query = `SELECT id, name, patient_unique_id, phone, profile_photo_url, date_of_birth, age
               FROM users WHERE role = 'patient' AND (
                 name ILIKE $1 OR patient_unique_id ILIKE $1 OR phone ILIKE $1
               ) ORDER BY name LIMIT 20`;
      params = [`%${q.trim()}%`];
    } else {
      query = `SELECT id, name, patient_unique_id, phone, profile_photo_url, date_of_birth, age
               FROM users WHERE role = 'patient' ORDER BY name LIMIT 20`;
      params = [];
    }
    const { rows } = await pool.query(query, params);
    res.json({ patients: rows });
  } catch (err) {
    console.error('Patient search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register a new patient (from doctor dashboard)
app.post('/api/patients/register', authenticate, async (req, res) => {
  const { name, email, phone, date_of_birth, gender } = req.body;
  if (!name || !email || !date_of_birth) return res.status(400).json({ error: 'Name, email and date of birth are required' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(uuidv4(), 10); // random password, patient can reset
    const id = uuidv4();
    const birth = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    const is_minor = age < 18;
    const patient_unique_id = await generatePatientUniqueId();

    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, date_of_birth, age, is_minor, gender, patient_unique_id)
       VALUES ($1, $2, $3, $4, 'patient', $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, phone, date_of_birth, age, is_minor, gender, patient_unique_id, profile_photo_url`,
      [id, name, email, password_hash, phone || null, date_of_birth, age, is_minor, gender || null, patient_unique_id]
    );
    res.json({ patient: rows[0] });
  } catch (err) {
    console.error('Register patient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HOSPITAL DIRECTORY ROUTES ====================

// Search hospitals (autocomplete for Coimbatore)
app.get('/api/hospitals/search', async (req, res) => {
  const { q } = req.query;
  try {
    let query;
    let params;
    if (q && q.trim()) {
      query = `SELECT id, name, city FROM hospitals WHERE name ILIKE $1 ORDER BY name LIMIT 10`;
      params = [`%${q.trim()}%`];
    } else {
      query = `SELECT id, name, city FROM hospitals ORDER BY name LIMIT 10`;
      params = [];
    }
    const { rows } = await pool.query(query, params);
    res.json({ hospitals: rows });
  } catch (err) {
    console.error('Hospital search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'medlync' });
});

// One-time DB setup endpoint — run once then remove
app.get('/api/setup', async (req, res) => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await pool.query(`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('doctor', 'patient', 'pharmacy'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
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
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hospital_doctors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      hospital_user_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      specialization VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS prescriptions (
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
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS medicines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      dosage VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      refill_count INTEGER DEFAULT 0,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      prescription_id UUID NOT NULL REFERENCES prescriptions(id),
      pharmacy_id UUID NOT NULL REFERENCES users(id),
      dispensed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hospitals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      city VARCHAR(100) NOT NULL DEFAULT 'Coimbatore',
      type VARCHAR(50) NOT NULL DEFAULT 'hospital',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`INSERT INTO hospitals (name, city, type) VALUES
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
      ('Sri Ramakrishna Hospital', 'Coimbatore', 'hospital'),
      ('Lotus Eye Hospital', 'Coimbatore', 'hospital'),
      ('Sankara Eye Hospital', 'Coimbatore', 'hospital'),
      ('ESI Hospital', 'Coimbatore', 'hospital'),
      ('Karpagam Medical College Hospital', 'Coimbatore', 'hospital')
      ON CONFLICT (name) DO NOTHING`);
    res.json({ success: true, message: 'Schema applied successfully' });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`MedLync server running on http://localhost:${PORT}`);
});

