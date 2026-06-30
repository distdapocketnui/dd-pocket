"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getInitials, roleBadgeClass } from "@/lib/utils";
import {
  Eye, EyeOff, Mail, Phone, Building2, Users, User,
  KeyRound, Shield, Save, X, CheckCircle, Lock, Users as UsersIcon,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function ProfilPage() {
  const { user, refreshUser } = useAuth();
  const { updateUser, createApproval } = useData();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "Visitor") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user?.role === "Visitor") return null;

  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [resetError, setResetError] = useState("");

  // Refresh user data on mount + when tab becomes visible (e.g. after approval)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") refreshUser();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [refreshUser]);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", unit: "", department: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        unit: user.unit,
        department: user.department,
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    const result = await updateUser(user.id, form);
    if (result) {
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setSaving(false);
    setEditing(false);
  };

  const passwordValid = resetForm.newPassword.length >= 8;

  const handleResetPassword = async () => {
    setResetError("");

    if (!resetForm.newPassword) {
      setResetError("Password baru tidak boleh kosong");
      return;
    }
    if (resetForm.newPassword.length < 8) {
      setResetError("Password minimal 8 karakter");
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError("Konfirmasi password tidak cocok");
      return;
    }
    if (!user) return;

    const result = await createApproval({
      table_name: "users",
      record_id: user.id,
      action_type: "edit",
      old_data: { password: user.password },
      new_data: { password: resetForm.newPassword },
    });
    if (result) {
      setResetModalOpen(false);
      setResetForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      alert("Permintaan reset password telah dikirim ke Admin untuk disetujui.");
    } else {
      setResetError("Gagal mengirim permintaan. Coba lagi.");
    }
  };

  if (!user) return null;

  const infoFields = [
    { label: "Email", value: user.email, icon: Mail, color: "text-blue-600 bg-blue-50" },
    { label: "No. Handphone", value: user.phone || "—", icon: Phone, color: "text-emerald-600 bg-emerald-50" },
    { label: "Unit Kerja", value: user.unit || "—", icon: Building2, color: "text-violet-600 bg-violet-50" },
    { label: "Departemen", value: user.department || "—", icon: Users, color: "text-amber-600 bg-amber-50" },
    { label: "Username", value: user.username, icon: User, color: "text-cyan-600 bg-cyan-50" },
    {
      label: "Password", icon: KeyRound, color: "text-rose-600 bg-rose-50",
      value: (
        <div className="relative inline-flex items-center">
          <span className="font-mono text-sm tracking-wider">
            {showPassword ? user.password : "••••••••••"}
          </span>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            title={showPassword ? "Sembunyikan" : "Tampilkan"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ),
    },
  ];

  const editFields = [
    { key: "name", label: "Nama Lengkap", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "No. Handphone", type: "tel", required: false },
    { key: "unit", label: "Unit Kerja", type: "text", required: true },
    { key: "department", label: "Departemen", type: "text", required: true },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Informasi profil akun anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Avatar Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-200/50">
              {getInitials(user.name)}
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">{user.name}</h2>
            <span className={`inline-block mt-1.5 text-[11px] font-semibold px-3 py-1 rounded-full ${roleBadgeClass(user.role)}`}>
              <Shield size={11} className="inline mr-1" />
              {user.role}
            </span>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className={user.status === "Aktif" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  {user.status}
                </span>
              </div>
            </div>

            {/* Edit toggle */}
            <button
              onClick={() => editing ? setEditing(false) : setEditing(true)}
              className={`mt-4 w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                editing
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
              }`}
            >
              {editing ? "Batal" : "Edit Profil"}
            </button>
          </div>
        </div>

        {/* Right — Detail Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info Cards */}
          {editing ? (
            /* Edit Mode */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Edit Informasi Profil
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editFields.map(({ key, label, type, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                    <input
                      type={type}
                      required={required}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-blue-200"
                >
                  {saving ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <Save size={16} />}
                  Simpan Perubahan
                </button>
                {saveSuccess && (
                  <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle size={16} /> Tersimpan
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Informasi Akun
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {infoFields.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                      <div className="mt-0.5 text-sm font-medium text-gray-800">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset Password Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Reset Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ubah password akun anda</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOpen(true)}
                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <KeyRound size={15} />
                Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Regu Team — Full Width */}
      {(user.role === "Admin" || user.role === "Manager") && (
        <div className="space-y-4">
          {["A", "B", "C", "D"].map((r) => (
            <ReguTeam key={r} regu={r} />
          ))}
        </div>
      )}
      {(user.role === "Supervisor" || user.role === "Operator") && user.regu && (
        <ReguTeam regu={user.regu} />
      )}

      {/* Reset Password Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => { setResetModalOpen(false); setResetError(""); }}
        title="Reset Password"
        footer={
          <button
            type="submit"
            form="resetForm"
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <KeyRound size={15} /> Ubah Password
          </button>
        }
      >
        <form id="resetForm" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password Baru</label>
            <input
              type="password"
              required
              value={resetForm.newPassword}
              onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
              className={`w-full px-3.5 py-2.5 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                resetForm.newPassword && (passwordValid ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10" : "border-red-300 focus:border-red-500 focus:ring-red-500/10")
              }`}
              placeholder="Minimal 8 karakter"
              minLength={8}
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`flex items-center gap-1 text-xs transition-all ${
                resetForm.newPassword.length >= 8 ? "text-emerald-600" : resetForm.newPassword.length > 0 ? "text-red-500" : "text-gray-400"
              }`}>
                {resetForm.newPassword.length >= 8 ? (
                  <CheckCircle size={12} />
                ) : (
                  <X size={12} />
                )}
                <span>Minimal 8 karakter</span>
              </div>
              {resetForm.newPassword.length > 0 && (
                <span className={`text-[10px] font-medium ml-1 ${
                  passwordValid ? "text-emerald-500" : "text-red-400"
                }`}>
                  ({resetForm.newPassword.length}/8)
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              required
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
              className={`w-full px-3.5 py-2.5 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                resetForm.confirmPassword && (resetForm.newPassword === resetForm.confirmPassword ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10" : "border-red-300 focus:border-red-500 focus:ring-red-500/10")
              }`}
              placeholder="Ulangi password baru"
            />
            {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <X size={12} /> Password tidak cocok
              </p>
            )}
          </div>
          {resetError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resetError}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function ReguTeam({ regu }: { regu: string }) {
  const { users } = useData();
  const members = users.filter((u) => u.regu === regu && u.status === "Aktif");

  // Sort: Supervisor first, then Operator, then others
  const sorted = [...members].sort((a, b) => {
    if (a.role === "Supervisor") return -1;
    if (b.role === "Supervisor") return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Regu {regu}
        </h3>
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          {members.length} Personil
        </span>
      </div>
      {sorted.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">
          <UsersIcon size={24} className="mx-auto mb-2 opacity-50" />
          Belum ada personil
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">No. Handphone</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Unit Kerja</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Jabatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(m.name)}
                      </div>
                      <span className="font-semibold text-gray-800">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3.5 text-gray-600">{m.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-600">{m.unit || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      m.role === "Supervisor"
                        ? "bg-cyan-50 text-cyan-700"
                        : m.role === "Operator"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
