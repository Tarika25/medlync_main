import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signup, uploadProfilePhoto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Loader2, Upload, User as UserIcon, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const computedAge = dateOfBirth ? calculateAge(dateOfBirth) : null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { toast({ title: "Please select a role", variant: "destructive" }); return; }
    if (role === "doctor" && !hospitalName) { toast({ title: "Hospital name is required", variant: "destructive" }); return; }
    if (role === "pharmacy" && !pharmacyName) { toast({ title: "Pharmacy name is required", variant: "destructive" }); return; }
    if (role === "patient" && !dateOfBirth) { toast({ title: "Date of birth is required", variant: "destructive" }); return; }
    if (role === "patient" && computedAge !== null && computedAge < 18) { toast({ title: "Minors must be added through a parent account", variant: "destructive" }); return; }

    setLoading(true);
    try {
      let profile_photo_url;
      if (profilePhoto) { profile_photo_url = await uploadProfilePhoto(profilePhoto); }
      const { user } = await signup({
        name, email, password, role, phone,
        hospital_name: role === "doctor" ? hospitalName : undefined,
        pharmacy_name: role === "pharmacy" ? pharmacyName : undefined,
        date_of_birth: role === "patient" ? dateOfBirth : undefined,
        profile_photo_url,
      });
      setUser(user);
      navigate("/dashboard/" + user.role);
    } catch (err) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 lg:flex-row">
        <div className="w-full max-w-md animate-fade-in lg:mr-8">
          <div className="mb-8 flex items-center justify-center gap-2 lg:justify-start">
            <Pill className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold tracking-tight text-foreground">MedLync</span>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Create a secure account in minutes
            </div>
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-4 text-left">
                <CardTitle className="text-2xl font-semibold text-foreground">Create account</CardTitle>
                <CardDescription>Join MedLync as a doctor, patient, or pharmacy partner.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                  </div>

                  {role === "doctor" && (
                    <div className="space-y-2">
                      <Label htmlFor="hospital">Hospital Name</Label>
                      <Input
                        id="hospital"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="Enter your hospital name"
                        required
                      />
                    </div>
                  )}

                  {role === "pharmacy" && (
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy">Pharmacy Name</Label>
                      <Input id="pharmacy" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} placeholder="HealthFirst Pharmacy" required />
                    </div>
                  )}

                  {role === "patient" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                        {computedAge !== null && (
                          <p className="text-sm text-muted-foreground">Age: <span className="font-semibold text-foreground">{computedAge} years</span></p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Profile Photo</Label>
                        <div className="flex items-center gap-4">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-primary" />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                              <UserIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm transition-colors hover:bg-muted">
                              <Upload className="h-4 w-4" /> Upload Photo
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">What you can do here</h2>
          <ul className="space-y-2">
            <li>• Create and manage prescriptions with clarity</li>
            <li>• Keep medication history visible and organized</li>
            <li>• Support secure pharmacy verification for every handoff</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
