"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";


interface User {
  id: string;
  email: string;
  full_name?: string;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, companyId: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Placeholder: This is where Member 3 will add the Server Action to check Prisma
    console.log("Signing in with:", email);
    
    // For now, let's simulate a successful login
    setUser({ id: "1", email, full_name: "Test User" });
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, companyId: string) => {
    // Placeholder: This is where Member 3 will add the Server Action to create a User in Postgres
    console.log("Signing up:", fullName);
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};