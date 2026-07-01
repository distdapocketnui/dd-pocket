"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/client";
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
    const stored = localStorage.getItem("ddp_current_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("ddp_current_user");
      }
    }
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem("ddp_current_user");
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
        localStorage.removeItem("ddp_current_user");
        setUser(null);
        return;
      }

      const mapped = mapToUser(data);
      setUser(mapped);
      localStorage.setItem("ddp_current_user", JSON.stringify(mapped));
    } catch {
      localStorage.removeItem("ddp_current_user");
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
      localStorage.setItem("ddp_current_user", JSON.stringify(mapped));

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
    localStorage.removeItem("ddp_current_user");
  }, [user, addLog]);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  // State untuk peringatan auto-logout
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60);

  // Auto logout after 30 minutes of inactivity (dengan peringatan)
  useEffect(() => {
    if (!user) return;

    let timeout: ReturnType<typeof setTimeout>;
    let warningTimeout: ReturnType<typeof setTimeout>;
    let countdownInterval: ReturnType<typeof setInterval>;

    const doLogout = () => {
      setShowTimeoutWarning(false);
      setTimeoutCountdown(60);
      logout();
      addLog("Logout", "User logout otomatis karena tidak ada aktivitas selama 10 jam", "Dashboard", user);
    };

    const startCountdown = () => {
      setShowTimeoutWarning(true);
      setTimeoutCountdown(60);

      countdownInterval = setInterval(() => {
        setTimeoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeout = setTimeout(() => {
        clearInterval(countdownInterval);
        doLogout();
      }, 60 * 1000);
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      setShowTimeoutWarning(false);
      setTimeoutCountdown(60);

      // Tampilkan peringatan 60 detik sebelum 10 jam
      warningTimeout = setTimeout(() => {
        startCountdown();
      }, 10 * 60 * 60 * 1000 - 60 * 1000);

      // Logout setelah 10 jam
      timeout = setTimeout(() => {
        clearInterval(countdownInterval);
        doLogout();
      }, 10 * 60 * 60 * 1000);
    };

    const events = ["mousemove", "mousedown", "click", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, logout, addLog]);

  // Timeout Warning UI
  const TimeoutWarning = () => {
    if (!showTimeoutWarning) return null;
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center p-3 pointer-events-none">
        <div className="bg-red-600 text-white text-sm rounded-xl px-5 py-3 shadow-2xl pointer-events-auto flex items-center gap-3 animate-bounce">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="font-medium">
            Sesi akan berakhir dalam {timeoutCountdown} detik — sentuh layar untuk membatalkan
          </span>
        </div>
      </div>
    );
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole, refreshUser }}>
      {children}
      <TimeoutWarning />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
