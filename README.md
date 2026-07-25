# MedLync

A prescription management app built for clinics, patients, and pharmacies. Doctors create prescriptions, patients track them, and pharmacies verify and dispense — all in one place.

## What it does

- Doctors create digital prescriptions with medicine details, diagnosis, and follow-up dates
- Patients see all their prescriptions, get refill reminders, and can add family members
- Pharmacies scan or enter a prescription code to verify and dispense it
- Every prescription gets a unique barcode for quick lookup

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Node.js + Express
- PostgreSQL
- JWT authentication

## Folder structure

```
src/
  pages/        — role-based dashboards and public pages
  components/   — shared layout and UI pieces
  contexts/     — auth state
  lib/          — API calls and utilities
server/
  index.js      — all backend routes
  db.js         — PostgreSQL connection
  schema.sql    — database tables and seed data
```

## Running locally

### Requirements

- Node.js 18+
- PostgreSQL running locally

### 1. Set up the database

```bash
createdb medlync
psql -d medlync -f server/schema.sql
```

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp server/.env.example server/.env
```

```env
JWT_SECRET=your-secret-here
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/medlync
```

### 3. Install and run

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (new terminal)
cd ..
npm install
npm run dev
```

Frontend runs at `http://localhost:8080`, backend at `http://localhost:3001`.

## Accounts to test with

Sign up with any email and pick a role — doctor, patient, or pharmacy. Each role gets its own dashboard.

- Doctors need to add at least one doctor name under "Manage Doctors" before creating a prescription
- Patients registered through the doctor dashboard get a unique ID like `PAT-2026-0001`
- Pharmacies verify prescriptions by entering the prescription code or scanning the barcode

## Notes

- Uploaded profile photos are stored in `server/uploads/` — this folder is excluded from git
- The `server/.env` file is never committed — use `.env.example` as a reference
- Minor patients (under 18) must be added through a parent account
