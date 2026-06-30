"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapToUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || "",
    unit: raw.unit || "",
    department: raw.department || "",
    regu: raw.regu || "",
    username: raw.username,
    password: raw.password,
    role: raw.role as UserRole,
    status: raw.status as "Aktif" | "Nonaktif",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from session storage on mount (fast restore)
  useEffect(() => {
    const stored = sessionStorage.getItem("ddp_current_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("ddp_current_user");
      }
    }
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = sessionStorage.getItem("ddp_current_user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", parsed.id)
        .single();

      if (error || !data) {
        sessionStorage.removeItem("ddp_current_user");
        setUser(null);
        return;
      }

      const mapped = mapToUser(data);
      setUser(mapped);
      sessionStorage.setItem("ddp_current_user", JSON.stringify(mapped));
    } catch {
      sessionStorage.removeItem("ddp_current_user");
      setUser(null);
    }
  }, []);

  const addLog = useCallback(async (action: string, details: string, page: string, currentUser: User | null) => {
    try {
      const supabase = getSupabaseClient();
      await supabase.from("activity_logs").insert({
        action,
        user: currentUser?.name || "System",
        page,
        timestamp: new Date().toLocaleString("id-ID", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }),
        details,
      });
    } catch { /* silently fail */ }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .eq("status", "Aktif")
        .single();

      if (error || !data) {
        return { success: false, message: "Username atau password salah, atau akun tidak aktif" };
      }

      const mapped = mapToUser(data);
      setUser(mapped);
      sessionStorage.setItem("ddp_current_user", JSON.stringify(mapped));

      // Log activity
      await addLog("Login", "User login ke sistem", "Dashboard", mapped);

      return { success: true, message: "" };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "Terjadi kesalahan koneksi database" };
    }
  }, [addLog]);

  const logout = useCallback(() => {
    if (user) {
      addLog("Logout", "User logout dari sistem", "Dashboard", user);
    }
    setUser(null);
    sessionStorage.removeItem("ddp_current_user");
  }, [user, addLog]);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  // Auto logout after 10 minutes of inactivity
  useEffect(() => {
    if (!user) return;

    let timeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        addLog("Logout", "User logout otomatis karena tidak ada aktivitas selama 10 menit", "Dashboard", user);
      }, 10 * 60 * 1000);
    };

    const events = ["mousemove", "mousedown", "click", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, logout, addLog]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
