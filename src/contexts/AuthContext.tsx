import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStoredUser, clearStoredSession } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "patient" | "pharmacy";
  phone: string;
  hospital_name?: string;
  pharmacy_name?: string;
  date_of_birth?: string;
  age?: number;
  is_minor?: boolean;
  parent_account_id?: string;
  relationship_type?: string;
  profile_photo_url?: string;
  patient_unique_id?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) setUser(storedUser);
    setIsLoading(false);
  }, []);

  const logout = () => {
    clearStoredSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
