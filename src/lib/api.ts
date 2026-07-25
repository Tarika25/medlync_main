const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("medlync_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function signup(data: {
  name: string; email: string; password: string; role: string; phone: string;
  hospital_name?: string; pharmacy_name?: string; date_of_birth?: string;
  parent_account_id?: string; relationship_type?: string; profile_photo_url?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/signup`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  localStorage.setItem("medlync_token", json.token);
  localStorage.setItem("medlync_user", JSON.stringify(json.user));
  return json;
}

export async function login(data: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  localStorage.setItem("medlync_token", json.token);
  localStorage.setItem("medlync_user", JSON.stringify(json.user));
  return json;
}

export function clearStoredSession() {
  localStorage.removeItem("medlync_token");
  localStorage.removeItem("medlync_user");
}

export function getStoredUser() {
  const user = localStorage.getItem("medlync_user");
  return user ? JSON.parse(user) : null;
}

export function getToken() {
  return localStorage.getItem("medlync_token");
}

export async function createPrescription(data: {
  patient_id: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; refill_count?: number }[];
  doctor_name: string;
  validity_days?: number;
  chief_complaint?: string;
  symptoms?: string;
  diagnosis?: string;
  follow_up_date?: string;
  additional_notes?: string;
}) {
  const res = await fetch(`${API_BASE}/prescriptions/create`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function listPrescriptions() {
  const res = await fetch(`${API_BASE}/prescriptions/list`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function verifyPrescription(code: string) {
  const res = await fetch(`${API_BASE}/prescriptions/verify?code=${encodeURIComponent(code)}`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function getPatients(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${API_BASE}/prescriptions/patients${params}`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function searchAllPatients(q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`${API_BASE}/patients/search${params}`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function registerPatient(data: {
  name: string; email: string; phone?: string; date_of_birth: string; gender?: string;
}) {
  const res = await fetch(`${API_BASE}/patients/register`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function dispensePrescription(prescription_code: string, collected_by = "self") {
  const res = await fetch(`${API_BASE}/pharmacy/dispense`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ prescription_code, collected_by }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function getTransactions() {
  const res = await fetch(`${API_BASE}/pharmacy/transactions`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function getFamilyMembers() {
  const res = await fetch(`${API_BASE}/prescriptions/family`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function addFamilyMember(data: {
  name: string; email: string; password: string; date_of_birth: string;
  relationship_type: string; profile_photo_url?: string; gender?: string;
}) {
  const res = await fetch(`${API_BASE}/prescriptions/add-family`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("medlync_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload/profile-photo`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload photo");
  const json = await res.json();
  return json.url;
}

// Hospital doctor management
export async function getHospitalDoctors() {
  const res = await fetch(`${API_BASE}/prescriptions/doctors`, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function addHospitalDoctor(data: { name: string; specialization?: string }) {
  const res = await fetch(`${API_BASE}/prescriptions/add-doctor`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function removeHospitalDoctor(doctor_id: string) {
  const res = await fetch(`${API_BASE}/prescriptions/remove-doctor`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ doctor_id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function searchHospitals(q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`${API_BASE}/hospitals/search${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

