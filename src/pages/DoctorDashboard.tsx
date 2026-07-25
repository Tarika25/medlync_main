import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { createPrescription, listPrescriptions, searchAllPatients, registerPatient, getHospitalDoctors, addHospitalDoctor, removeHospitalDoctor } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, Users, FileText, Stethoscope, Search, AlertTriangle, Clock, UserPlus, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Barcode from "react-barcode";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  refill_count: number;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [validityDays, setValidityDays] = useState("7");
  const [patientSearch, setPatientSearch] = useState("");
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", email: "", phone: "", date_of_birth: "", gender: "" });
  const [registeringPatient, setRegisteringPatient] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: "", dosage: "", frequency: "", duration: "", refill_count: 0 }]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [voiceTarget, setVoiceTarget] = useState<string | null>(null);
  const { isListening, startListening, stopListening, isSupported: voiceSupported } = useVoiceDictation();
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorSpec, setNewDoctorSpec] = useState("");
  const [addingDoctor, setAddingDoctor] = useState(false);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const [prescriptionResponse, patientResponse, doctorResponse] = await Promise.all([
        listPrescriptions(), searchAllPatients(), getHospitalDoctors()
      ]);
      setPrescriptions(prescriptionResponse.prescriptions || []);
      setPatients(patientResponse.patients || []);
      setHospitalDoctors(doctorResponse.doctors || []);
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleSearchPatients = async (query: string) => {
    setPatientSearch(query);
    setSearchingPatients(true);
    try {
      const res = await searchAllPatients(query.length >= 2 ? query : undefined);
      setPatients(res.patients || []);
    } catch { }
    finally { setSearchingPatients(false); }
  };

  const handleRegisterPatient = async () => {
    if (!newPatient.name || !newPatient.email || !newPatient.date_of_birth) {
      toast({ title: "Name, email and date of birth are required", variant: "destructive" }); return;
    }
    setRegisteringPatient(true);
    try {
      const res = await registerPatient(newPatient);
      const p = res.patient;
      setPatients((prev) => [p, ...prev]);
      setSelectedPatientId(p.id);
      setSelectedPatient(p);
      setPatientSearch(`${p.patient_unique_id} — ${p.name}`);
      setShowRegisterForm(false);
      setNewPatient({ name: "", email: "", phone: "", date_of_birth: "", gender: "" });
      toast({ title: "Patient registered!", description: `ID: ${p.patient_unique_id}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRegisteringPatient(false);
    }
  };

  const addMedicine = () => setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "", refill_count: 0 }]);
  const removeMedicine = (medicineIndex: number) => setMedicines(medicines.filter((_, index) => index !== medicineIndex));
  const updateMedicine = (medicineIndex: number, field: keyof Medicine, value: string | number) => {
    const updatedMedicines = [...medicines];
    if (field === "refill_count") {
      updatedMedicines[medicineIndex][field] = Number(value);
    } else {
      (updatedMedicines[medicineIndex] as any)[field] = value;
    }
    setMedicines(updatedMedicines);
  };

  const handleCreate = async () => {
    if (!selectedPatientId) {
      toast({ title: "Select a patient before creating the prescription", variant: "destructive" });
      return;
    }
    if (!selectedDoctor) {
      toast({ title: "Choose the prescribing doctor", variant: "destructive" });
      return;
    }
    if (medicines.some((m) => !m.name || !m.dosage || !m.frequency || !m.duration)) { toast({ title: "Fill all medicine fields", variant: "destructive" }); return; }
    setCreating(true);
    try {
      await createPrescription({
        patient_id: selectedPatientId,
        medicines,
        doctor_name: selectedDoctor,
        validity_days: parseInt(validityDays) || 7,
        chief_complaint: chiefComplaint || undefined,
        symptoms: symptoms || undefined,
        diagnosis: diagnosis || undefined,
        follow_up_date: followUpDate || undefined,
        additional_notes: additionalNotes || undefined,
      });
      toast({ title: "Prescription created!" });
      setCreateOpen(false);
      setSelectedPatientId("");
      setSelectedPatient(null);
      setSelectedDoctor("");
      setPatientSearch("");
      setShowRegisterForm(false);
      setNewPatient({ name: "", email: "", phone: "", date_of_birth: "", gender: "" });
      setValidityDays("7");
      setChiefComplaint("");
      setSymptoms("");
      setDiagnosis("");
      setFollowUpDate("");
      setAdditionalNotes("");
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "", refill_count: 0 }]);
      fetchDashboardData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!newDoctorName.trim()) { toast({ title: "Enter doctor name", variant: "destructive" }); return; }
    setAddingDoctor(true);
    try {
      await addHospitalDoctor({ name: newDoctorName.trim(), specialization: newDoctorSpec.trim() || undefined });
      toast({ title: "Doctor added!" });
      setNewDoctorName("");
      setNewDoctorSpec("");
      const res = await getHospitalDoctors();
      setHospitalDoctors(res.doctors || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingDoctor(false);
    }
  };

  const handleRemoveDoctor = async (id: string) => {
    try {
      await removeHospitalDoctor(id);
      setHospitalDoctors(hospitalDoctors.filter((d) => d.id !== id));
      toast({ title: "Doctor removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activePrescriptions = prescriptions.filter((p) => p.status === "Active");
  const expiredPrescriptions = prescriptions.filter((p) => p.status === "Expired");
  const dispensedPrescriptions = prescriptions.filter((p) => p.status === "Used");
  const nearExpiryPrescriptions = prescriptions.filter((p) => p.is_near_expiry);
  const totalPatients = new Set(prescriptions.map((p) => p.patient_id)).size;

  const openDetail = (p: any) => {
    setSelectedPrescription(p);
    setDetailOpen(true);
  };

  const getStatusBadge = (p: any) => {
    if (p.status === "Expired") return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
    if (p.is_near_expiry) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 animate-pulse">Expiring Soon</Badge>;
    if (p.status === "Used") return <Badge className="bg-success/10 text-success border-success/20">Dispensed</Badge>;
    return <Badge className="bg-warning/10 text-warning border-warning/20">Active</Badge>;
  };

  const renderPrescriptionTable = (items: any[]) => (
    <Card className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Name</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow
                key={p.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${p.is_near_expiry ? "bg-destructive/5" : ""}`}
                onClick={() => openDetail(p)}
              >
                <TableCell className="font-medium">{p.patient?.name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{p.patient?.patient_unique_id || "—"}</TableCell>
                <TableCell className="text-sm">{p.doctor_name || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm">
                  {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>{getStatusBadge(p)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {user?.hospital_name || "Hospital Dashboard"}
            </h1>
            <p className="text-muted-foreground mt-1">
              <Stethoscope className="inline h-4 w-4 mr-1" />
              {user?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><UserPlus className="h-4 w-4 mr-2" /> Manage Doctors</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Manage Doctors</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Doctor Name</Label>
                    <Input value={newDoctorName} onChange={(e) => setNewDoctorName(e.target.value)} placeholder="Dr. John Smith" />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialization (optional)</Label>
                    <Input value={newDoctorSpec} onChange={(e) => setNewDoctorSpec(e.target.value)} placeholder="Cardiologist" />
                  </div>
                  <Button onClick={handleAddDoctor} className="w-full gradient-primary text-primary-foreground" disabled={addingDoctor}>
                    {addingDoctor && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Doctor
                  </Button>
                  {hospitalDoctors.length > 0 && (
                    <div className="border border-border rounded-md divide-y divide-border">
                      {hospitalDoctors.map((d) => (
                        <div key={d.id} className="px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{d.name}</p>
                            {d.specialization && <p className="text-xs text-muted-foreground">{d.specialization}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveDoctor(d.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> New Prescription</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Create Prescription</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Prescribing Doctor <span className="text-destructive">*</span></Label>
                    {hospitalDoctors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No doctors added yet. <button type="button" className="text-primary underline" onClick={() => { setCreateOpen(false); setDoctorDialogOpen(true); }}>Add doctors first</button></p>
                    ) : (
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                        <SelectContent>
                          {hospitalDoctors.map((d) => (
                            <SelectItem key={d.id} value={d.name}>
                              {d.name}{d.specialization ? ` (${d.specialization})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>


                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Search Patient</Label>
                      <button type="button" className="text-xs text-primary underline" onClick={() => setShowRegisterForm((v) => !v)}>
                        {showRegisterForm ? "Cancel" : "+ Register New Patient"}
                      </button>
                    </div>

                    {showRegisterForm ? (
                      <div className="border border-border rounded-md p-3 space-y-2 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Patient</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Full name *" value={newPatient.name} onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))} />
                          <Input placeholder="Email *" type="email" value={newPatient.email} onChange={(e) => setNewPatient((p) => ({ ...p, email: e.target.value }))} />
                          <Input placeholder="Phone" value={newPatient.phone} onChange={(e) => setNewPatient((p) => ({ ...p, phone: e.target.value }))} />
                          <Input placeholder="Date of birth *" type="date" value={newPatient.date_of_birth} onChange={(e) => setNewPatient((p) => ({ ...p, date_of_birth: e.target.value }))} />
                        </div>
                        <Select value={newPatient.gender} onValueChange={(v) => setNewPatient((p) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder="Gender (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleRegisterPatient} className="w-full gradient-primary text-primary-foreground" size="sm" disabled={registeringPatient}>
                          {registeringPatient && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />} Register & Select Patient
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={patientSearch} onChange={(e) => handleSearchPatients(e.target.value)} placeholder="Search by name, ID or phone" className="pl-10" />
                        </div>
                        {searchingPatients && <p className="text-xs text-muted-foreground">Searching...</p>}
                        {patients.length > 0 && (
                          <div className="space-y-2">
                            <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                              {patients.map((patient) => (
                                <button key={patient.id} type="button" onClick={() => {
                                  setSelectedPatientId(patient.id);
                                  setSelectedPatient(patient);
                                  setPatientSearch(`${patient.patient_unique_id || ""} — ${patient.name}`);
                                }}
                                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-3 text-sm border-b border-border last:border-0 transition-colors ${selectedPatientId === patient.id ? "bg-primary/10" : ""}`}>
                                  {patient.profile_photo_url ? (
                                    <img src={patient.profile_photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"><Users className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{patient.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {patient.patient_unique_id && <span className="font-mono">{patient.patient_unique_id}</span>}
                                      {patient.phone && <span> • {patient.phone}</span>}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                            {selectedPatient && (
                              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                                <p className="font-medium text-foreground">Selected patient</p>
                                <p className="text-muted-foreground">{selectedPatient.name} {selectedPatient.patient_unique_id ? `• ${selectedPatient.patient_unique_id}` : ""}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Clinical Details</Label>
                      {voiceSupported && (
                        <Button
                          type="button"
                          variant={isListening ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isListening) {
                              stopListening();
                              setVoiceTarget(null);
                            } else {
                              toast({ title: "Voice input active", description: "Speak now. Click a field label to target it, or dictate freely." });
                            }
                          }}
                        >
                          {isListening ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
                          {isListening ? "Stop Dictation" : "Voice Input"}
                        </Button>
                      )}
                    </div>

                    {[
                      { label: "Chief Complaint / Purpose of Visit", value: chiefComplaint, setter: setChiefComplaint, key: "complaint" },
                      { label: "Symptoms", value: symptoms, setter: setSymptoms, key: "symptoms" },
                      { label: "Diagnosis", value: diagnosis, setter: setDiagnosis, key: "diagnosis" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label>{field.label}</Label>
                          {voiceSupported && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${voiceTarget === field.key && isListening ? "text-destructive" : "text-muted-foreground"}`}
                              onClick={() => {
                                if (voiceTarget === field.key && isListening) {
                                  stopListening();
                                  setVoiceTarget(null);
                                } else {
                                  setVoiceTarget(field.key);
                                  startListening((text) => {
                                    field.setter((prev: string) => prev ? `${prev} ${text}` : text);
                                  });
                                }
                              }}
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <Textarea
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="min-h-[60px]"
                        />
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Follow-up Date</Label>
                        <Input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Prescription Validity (days)</Label>
                        <Input type="number" min="1" max="365" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="7" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label>Additional Notes</Label>
                        {voiceSupported && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 ${voiceTarget === "notes" && isListening ? "text-destructive" : "text-muted-foreground"}`}
                            onClick={() => {
                              if (voiceTarget === "notes" && isListening) {
                                stopListening();
                                setVoiceTarget(null);
                              } else {
                                setVoiceTarget("notes");
                                startListening((text) => {
                                  setAdditionalNotes((prev) => prev ? `${prev} ${text}` : text);
                                });
                              }
                            }}
                          >
                            <Mic className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Any additional instructions..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Medicines</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addMedicine}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </div>
                    {medicines.map((m, i) => (
                      <Card key={i} className="bg-muted/50">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Medicine {i + 1}</span>
                            {medicines.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Medicine name" value={m.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} />
                            <Input placeholder="Dosage (e.g. 500mg)" value={m.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} />
                            <Input placeholder="Frequency (e.g. 2x/day)" value={m.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
                            <Input placeholder="Duration (e.g. 3 months)" value={m.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Refill Count</Label>
                            <Input type="number" min="0" max="12" value={m.refill_count} onChange={(e) => updateMedicine(i, "refill_count", e.target.value)} className="w-20 h-8 text-sm" placeholder="0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button onClick={handleCreate} className="w-full gradient-primary text-primary-foreground" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Prescription
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalPatients}</p>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activePrescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{expiredPrescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dispensedPrescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Dispensed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {nearExpiryPrescriptions.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm font-medium text-destructive">
                {nearExpiryPrescriptions.length} prescription(s) expiring within 7 days
              </p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : prescriptions.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prescriptions yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({prescriptions.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activePrescriptions.length})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({expiredPrescriptions.length})</TabsTrigger>
              <TabsTrigger value="dispensed">Dispensed ({dispensedPrescriptions.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">{renderPrescriptionTable(prescriptions)}</TabsContent>
            <TabsContent value="active" className="mt-4">{renderPrescriptionTable(activePrescriptions)}</TabsContent>
            <TabsContent value="expired" className="mt-4">{renderPrescriptionTable(expiredPrescriptions)}</TabsContent>
            <TabsContent value="dispensed" className="mt-4">{renderPrescriptionTable(dispensedPrescriptions)}</TabsContent>
          </Tabs>
        )}

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Prescription Details</DialogTitle>
            </DialogHeader>
            {selectedPrescription && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Doctor</p>
                    <p className="font-medium">{selectedPrescription.doctor_name || user?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hospital</p>
                    <p className="font-medium">{user?.hospital_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Patient</p>
                    <p className="font-medium">{selectedPrescription.patient?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Patient ID</p>
                    <p className="font-mono font-medium">{selectedPrescription.patient?.patient_unique_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(selectedPrescription.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className={`font-medium ${selectedPrescription.is_expired ? "text-destructive" : selectedPrescription.is_near_expiry ? "text-destructive" : ""}`}>
                      {selectedPrescription.expires_at ? new Date(selectedPrescription.expires_at).toLocaleDateString() : "—"}
                      {selectedPrescription.is_expired && " (Expired)"}
                      {selectedPrescription.is_near_expiry && " ⚠️"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Validity</p>
                    <p className="font-medium">{selectedPrescription.validity_days} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {getStatusBadge(selectedPrescription)}
                  </div>
                </div>

                {(selectedPrescription.chief_complaint || selectedPrescription.symptoms || selectedPrescription.diagnosis) && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {selectedPrescription.chief_complaint && (
                      <div className="text-sm"><p className="text-muted-foreground">Chief Complaint</p><p className="font-medium">{selectedPrescription.chief_complaint}</p></div>
                    )}
                    {selectedPrescription.symptoms && (
                      <div className="text-sm"><p className="text-muted-foreground">Symptoms</p><p className="font-medium">{selectedPrescription.symptoms}</p></div>
                    )}
                    {selectedPrescription.diagnosis && (
                      <div className="text-sm"><p className="text-muted-foreground">Diagnosis</p><p className="font-medium">{selectedPrescription.diagnosis}</p></div>
                    )}
                    {selectedPrescription.follow_up_date && (
                      <div className="text-sm"><p className="text-muted-foreground">Follow-up Date</p><p className="font-medium">{new Date(selectedPrescription.follow_up_date).toLocaleDateString()}</p></div>
                    )}
                    {selectedPrescription.additional_notes && (
                      <div className="text-sm"><p className="text-muted-foreground">Notes</p><p className="font-medium">{selectedPrescription.additional_notes}</p></div>
                    )}
                  </div>
                )}

                <div className="flex justify-center py-2 overflow-hidden">
                  <Barcode value={selectedPrescription.barcode_id || selectedPrescription.prescription_code} width={1.5} height={55} fontSize={11} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Medicines</p>
                  <div className="space-y-2">
                    {selectedPrescription.medicines?.map((m: any) => (
                      <div key={m.id} className="text-sm p-2.5 rounded-md bg-muted/50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{m.name}</p>
                          {m.end_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Until {new Date(m.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{m.dosage} • {m.frequency} • {m.duration}</p>
                        {m.refill_count > 0 && <p className="text-xs text-primary mt-1">Refills: {m.refill_count}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
