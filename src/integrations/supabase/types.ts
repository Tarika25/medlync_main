// MedLync PostgreSQL schema types

export type UserRole = "doctor" | "patient" | "pharmacy";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  hospital_name: string | null;
  pharmacy_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  is_minor: boolean | null;
  parent_account_id: string | null;
  relationship_type: string | null;
  profile_photo_url: string | null;
  patient_unique_id: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string | null;
  prescription_code: string;
  barcode_id: string | null;
  status: string;
  validity_days: number;
  expires_at: string | null;
  chief_complaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  follow_up_date: string | null;
  additional_notes: string | null;
  collected_by: string | null;
  created_at: string;
  patient?: User | null;
  doctor?: any;
  medicines?: Medicine[];
  is_near_expiry?: boolean;
  is_expired?: boolean;
}

export interface Medicine {
  id: string;
  prescription_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  refill_count: number;
  end_date: string | null;
}

export interface Transaction {
  id: string;
  prescription_id: string;
  pharmacy_id: string;
  dispensed_at: string;
  prescriptions?: {
    prescription_code: string;
    collected_by: string | null;
  };
}

export interface HospitalDoctor {
  id: string;
  hospital_user_id: string;
  name: string;
  specialization: string | null;
  created_at: string;
}

export interface OtpVerification {
  id: string;
  prescription_id: string;
  phone_number: string;
  otp_code: string;
  is_verified: boolean;
  created_at: string | null;
}
