# MedLync

MedLync is a care-focused prescription workspace for doctors, patients, and pharmacies. It helps teams manage prescriptions, verify eligibility, and support safe pickup workflows in one place.

## What this product does

- Doctors can create prescriptions and manage the care team linked to a hospital.
- Patients can view prescriptions, track refill reminders, and manage family access.
- Pharmacies can verify prescription codes and complete dispensing steps securely.

## Core stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js and Express
- Database: PostgreSQL
- Authentication: JWT with bcrypt

## Project structure

- src/pages: public pages and role-based dashboards
- src/components: shared UI shell and dashboard layout
- src/contexts: authentication state
- src/lib: API helpers and shared utilities
- server: Express API and PostgreSQL schema

## Local setup

### 1. Prerequisites

- Node.js 18 or newer
- PostgreSQL running locally

### 2. Create the database

```bash
createdb medlync
psql -d medlync -f server/schema.sql
```

### 3. Configure environment variables

Create a file at server/.env with:

```env
JWT_SECRET=change-this-secret
DATABASE_URL=postgresql://postgres:root@localhost:5432/medlync
```

### 4. Install dependencies

```bash
cd server
npm install
cd ..
npm install
```

### 5. Run the app

Start the backend:

```bash
cd server
npm start
```

Start the frontend:

```bash
npm run dev
```

The frontend is usually available at http://localhost:5173 and the API at http://localhost:3001.

## Notes on development

- The frontend uses API helpers from src/lib/api.ts.
- The backend routes are grouped under /api and expect a PostgreSQL database with the schema from server/schema.sql.
- The app includes a small regression test suite under src/test.

## License

This project is provided as-is for local development and product demos.
