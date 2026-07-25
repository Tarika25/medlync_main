import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Pill, Stethoscope, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const roleIcons = {
  doctor: Stethoscope,
  patient: User,
  pharmacy: Building2,
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const Icon = roleIcons[user.role];

  const roleLabel = user.role === "doctor"
    ? "Hospital Dashboard"
    : user.role === "pharmacy"
    ? user.pharmacy_name || "Pharmacy Dashboard"
    : "Patient Dashboard";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" />
              <span className="text-lg font-display font-bold text-foreground">MedLync</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-secondary">
              <Icon className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">{roleLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.profile_photo_url && (
              <img src={user.profile_photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-border" />
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate("/login"); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
