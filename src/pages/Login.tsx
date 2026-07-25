import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login({ email, password });
      setUser(user);
      navigate(`/dashboard/${user.role}`);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 lg:flex-row">
        <div className="w-full max-w-md animate-fade-in lg:mr-8">
          <div className="mb-8 flex items-center justify-center gap-2 lg:justify-start">
            <Pill className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold tracking-tight text-foreground">MedLync</span>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Secure access for care teams
            </div>
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-4 text-left">
                <CardTitle className="text-2xl font-semibold text-foreground">Welcome back</CardTitle>
                <CardDescription>Sign in to continue managing patient care with confidence.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Create an account
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Why people trust MedLync</h2>
          <ul className="space-y-2">
            <li>• Clear prescription visibility for doctors, patients, and pharmacies</li>
            <li>• Safer handoffs with barcode-backed verification</li>
            <li>• A calmer workflow designed around real care coordination</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
