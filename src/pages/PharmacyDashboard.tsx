import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { verifyPrescription, dispensePrescription, getTransactions } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, XCircle, ClipboardList, Shield, User as UserIcon, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Barcode from "react-barcode";

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [verifyError, setVerifyError] = useState("");
  const [collectedBy, setCollectedBy] = useState<"self" | "family">("self");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    getTransactions()
      .then((res) => setTransactions(res.transactions || []))
      .catch(() => {})
      .finally(() => setLoadingTx(false));
  }, []);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    setPrescription(null);
    setVerifyError("");
    try {
      const res = await verifyPrescription(code.trim());
      setPrescription(res.prescription);
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDispense = async () => {
    setDispensing(true);
    try {
      // Always use the verified prescription_code (not raw scan input which may be a barcode_id)
      await dispensePrescription(prescription.prescription_code, collectedBy);
      toast({ title: "Prescription dispensed successfully" });
      setPrescription(null);
      setCode("");
      setCollectedBy("self");
      const res = await getTransactions();
      setTransactions(res.transactions || []);
    } catch (err: any) {
      toast({ title: "Could not complete dispensing", description: err.message, variant: "destructive" });
    } finally {
      setDispensing(false);
    }
  };

  const isExpired = prescription?.is_expired;
  const isDispensed = prescription?.status === "Used";
  const canDispense = prescription?.can_dispense === true;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {user?.pharmacy_name || "Verify & Dispense"}
          </h1>
          <p className="text-muted-foreground mt-1">Enter a prescription barcode to verify and dispense</p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="code" className="sr-only">Prescription Barcode</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter or scan barcode (e.g. RX123456789012)"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
              </div>
              <Button onClick={handleVerify} disabled={verifying} className="gradient-primary text-primary-foreground">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                Verify
              </Button>
            </div>

            {verifyError && (
              <div className="mt-4 flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" /><span className="text-sm">{verifyError}</span>
              </div>
            )}

            {prescription && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-4 animate-fade-in">
                {prescription.patient && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                    {prescription.patient.profile_photo_url ? (
                      <img src={prescription.patient.profile_photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><UserIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{prescription.patient.name}</p>
                      {prescription.patient.patient_unique_id && <p className="text-xs font-mono text-muted-foreground">{prescription.patient.patient_unique_id}</p>}
                      {prescription.patient.phone && <p className="text-xs text-muted-foreground">{prescription.patient.phone}</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{prescription.prescription_code}</span>
                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>
                    ) : isDispensed ? (
                      <Badge className="bg-success/10 text-success border-success/20">Dispensed</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">Active</Badge>
                    )}
                  </div>
                </div>

                {prescription.expires_at && (
                  <div className={`flex items-center gap-2 text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                    <Clock className="h-4 w-4" />
                    <span>
                      {isExpired
                        ? `Expired on ${new Date(prescription.expires_at).toLocaleDateString()}`
                        : `Valid until ${new Date(prescription.expires_at).toLocaleDateString()} (${prescription.validity_days} days)`
                      }
                    </span>
                  </div>
                )}

                {prescription.doctor_name && (
                  <p className="text-sm text-muted-foreground">Prescribed by: <span className="font-medium text-foreground">Dr. {prescription.doctor_name}</span></p>
                )}

                <div className="flex justify-center overflow-hidden">
                  <Barcode value={prescription.barcode_id || prescription.prescription_code} width={1.5} height={50} fontSize={10} />
                </div>

                <div className="space-y-1">
                  {prescription.medicines?.map((m: any) => (
                    <div key={m.id} className="text-sm">
                      <span className="font-medium">{m.name}</span> — {m.dosage}, {m.frequency}, {m.duration}
                      {m.end_date && <span className="text-muted-foreground"> (until {new Date(m.end_date).toLocaleDateString()})</span>}
                    </div>
                  ))}
                </div>

                {isExpired && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">This prescription has expired</p>
                      <p className="text-xs text-destructive/80">A new prescription is required for further purchase</p>
                    </div>
                  </div>
                )}

                {!isExpired && !isDispensed && canDispense && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCollectedBy("self")}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                          collectedBy === "self" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        Self Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectedBy("family")}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                          collectedBy === "family" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        Family Pickup
                      </button>
                    </div>
                    <Button onClick={handleDispense} disabled={dispensing} className="w-full bg-success text-success-foreground hover:bg-success/90">
                      {dispensing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Dispense prescription
                    </Button>
                  </div>
                )}

                {isDispensed && !isExpired && (
                  <div className="flex items-center gap-2 text-warning">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Already dispensed — cannot dispense again</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-semibold">Transaction Log</h2>
          </div>
          {loadingTx ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : transactions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground">No transactions yet</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((t, i) => (
                <Card key={t.id} className="glass-card animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-medium">{t.prescriptions?.prescription_code}</span>
                      <p className="text-xs text-muted-foreground">{new Date(t.dispensed_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.prescriptions?.collected_by === "family" && <Badge variant="outline" className="text-xs">Family Pickup</Badge>}
                      <Badge className="bg-success/10 text-success border-0">Dispensed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
