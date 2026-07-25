const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("medlync_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function signup(data: {
  name: string; email: string; password: string; role: string; phone: string;
  hospital_name?: string; pharmacy_name?: string; date_of_birth?: string;
  parent_account_id?: string; relationship_type?: string; profile_photo_url?: string;
}) {
  const json = await request(`${API_BASE}/auth/signup`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  localStorage.setItem("medlync_token", json.token);
  localStorage.setItem("medlync_user", JSON.stringify(json.user));
  return json;
}

export async function login(data: { email: string; password: string }) {
  const json = await request(`${API_BASE}/auth/login`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  localStorage.setItem("medlync_token", json.token);
  localStorage.setItem("medlync_user", JSON.stringify(json.user));
  return json;
}

export function clearStoredSession() {
  localStorage.removeItem("medlync_token");
  localStorage.removeItem("medlync_user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("medlync_user");
  return raw ? JSON.parse(raw) : null;
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
  return request(`${API_BASE}/prescriptions/create`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function fetchPrescriptions() {
  return request(`${API_BASE}/prescriptions/list`, { headers: authHeaders() });
}

export async function verifyPrescriptionByCode(code: string) {
  return request(`${API_BASE}/prescriptions/verify?code=${encodeURIComponent(code)}`, {
    headers: authHeaders(),
  });
}

export async function searchAllPatients(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  return request(`${API_BASE}/patients/search${params}`, { headers: authHeaders() });
}

export async function registerPatient(data: {
  name: string; email: string; phone?: string; date_of_birth: string; gender?: string;
}) {
  return request(`${API_BASE}/patients/register`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function dispensePrescription(prescriptionCode: string, collectedBy = "self") {
  return request(`${API_BASE}/pharmacy/dispense`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ prescription_code: prescriptionCode, collected_by: collectedBy }),
  });
}

export async function fetchTransactions() {
  return request(`${API_BASE}/pharmacy/transactions`, { headers: authHeaders() });
}

export async function fetchFamilyMembers() {
  return request(`${API_BASE}/prescriptions/family`, { headers: authHeaders() });
}

export async function addFamilyMember(data: {
  name: string; email: string; password: string; date_of_birth: string;
  relationship_type: string; profile_photo_url?: string; gender?: string;
}) {
  return request(`${API_BASE}/prescriptions/add-family`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("medlync_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload/profile-photo`, { method: "POST", headers, body: formData });
  if (!res.ok) throw new Error("Photo upload failed");
  const json = await res.json();
  return json.url;
}

export async function fetchHospitalDoctors() {
  return request(`${API_BASE}/prescriptions/doctors`, { headers: authHeaders() });
}

export async function addHospitalDoctor(data: { name: string; specialization?: string }) {
  return request(`${API_BASE}/prescriptions/add-doctor`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function removeHospitalDoctor(doctorId: string) {
  return request(`${API_BASE}/prescriptions/remove-doctor`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ doctor_id: doctorId }),
  });
}

export async function searchHospitals(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  return request(`${API_BASE}/hospitals/search${params}`);
}
