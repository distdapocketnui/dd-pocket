"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth";
import { X, Lock, AlertTriangle, CheckCircle } from "lucide-react";

export default function PasswordResetModal() {
  const { user, showPasswordResetModal, setShowPasswordResetModal } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Hanya render modal jika showPasswordResetModal true
  if (!showPasswordResetModal || !user) return null;

  const handleClose = () => {
    console.log("Closing modal...");
    setShowPasswordResetModal(false);
    console.log("After set:", false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Semua field wajib diisi");
      return;
    }

    if (form.currentPassword !== "password123") {
      setError("Password saat ini salah");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const hashedPassword = await hashPassword(form.newPassword);

      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashedPassword })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update localStorage
      const updatedUser = { ...user, password: hashedPassword };
      localStorage.setItem("ddp_current_user", JSON.stringify(updatedUser));

      setSuccess(true);

      // Log activity (optional)
      try {
        const supabase = getSupabaseClient();
        await supabase.from("activity_logs").insert({
          action: "Reset Password",
          user: user.name,
          page: "Profil",
          timestamp: new Date().toLocaleString("id-ID", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
          }),
          details: "User mereset password sendiri",
        });
      } catch { /* silently fail */ }

      setTimeout(() => {
        setShowPasswordResetModal(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md relative overflow-hidden">
        {/* Header dengan gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                <p className="text-sm text-white/80">Wajib untuk keamanan akun Anda</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Password Anda saat ini masih menggunakan password default.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Segera ganti password untuk melindungi akun Anda dari akses yang tidak sah.
              </p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Password Berhasil Diubah!</h3>
              <p className="text-gray-500">Anda akan diarahkan kembali...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                  placeholder="Masukkan password saat ini"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white outline-none transition-all ${
                    form.newPassword && (form.newPassword.length >= 8 ? "border-emerald-400 focus:border-emerald-500" : "border-red-300 focus:border-red-500")
                  }`}
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  required
                />
                {form.newPassword.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex items-center gap-1 text-xs ${
                      form.newPassword.length >= 8 ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {form.newPassword.length >= 8 ? (
                        <CheckCircle size={12} />
                      ) : (
                        <X size={12} />
                      )}
                      <span>Minimal 8 karakter</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Ganti Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
