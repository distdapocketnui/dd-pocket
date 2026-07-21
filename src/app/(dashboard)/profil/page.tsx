"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getInitials, roleBadgeClass } from "@/lib/utils";
import {
  Eye, EyeOff, Mail, Phone, Building2, Users, User,
  KeyRound, Shield, Save, X, CheckCircle, Lock, Users as UsersIcon,
  GitBranch, Camera, Trash2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import imageCompression from "browser-image-compression";
export default function ProfilPage() {
  const { user, refreshUser } = useAuth();
  const { updateUser, createApproval } = useData();

  if (user?.role === "Visitor") return null;

  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [resetError, setResetError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasDefaultPassword, setHasDefaultPassword] = useState(false);

  // Upload foto profil
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh user data on mount + when tab becomes visible (e.g. after approval)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Detect default password
  useEffect(() => {
    if (user?.password) {
      // Default passwords: "12345678", "password", "admin123", etc.
      const defaultPasswords = ["12345678", "password", "admin123", "password123", "1234567890"];
      const isDefault = defaultPasswords.includes(user.password) || !user.password.startsWith("$2");
      setHasDefaultPassword(isDefault);
      if (isDefault) {
        // Auto-open reset modal on first visit
        setResetModalOpen(true);
      }
    }
  }, [user]);

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

    try {
      let avatarUrl = user.avatar_url;

      // Jika ada foto baru yang diupload
      if (avatarFile) {
        setUploadingAvatar(true);
        setAvatarError("");

        try {
          // Hapus foto lama jika ada
          if (avatarUrl) {
            await fetch("/api/storage/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ urls: [avatarUrl] }),
            });
          }

          // Upload foto baru
          const formData = new FormData();
          formData.append("file", avatarFile);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Gagal upload foto");
          }

          const data = await res.json();
          avatarUrl = data.url;
        } catch (err: any) {
          setAvatarError(err.message || "Gagal upload foto");
          setUploadingAvatar(false);
          setSaving(false);
          return;
        } finally {
          setUploadingAvatar(false);
        }
      }

      // Update user data
      const updateData: any = { ...form };
      if (avatarUrl !== undefined) {
        updateData.avatar_url = avatarUrl;
      }

      const result = await updateUser(user.id, updateData);
      if (result) {
        await refreshUser();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        setAvatarFile(null);
        setAvatarPreview(null);
        setEditing(false);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      setAvatarError("Hanya file gambar yang diizinkan");
      return;
    }

    try {
      setAvatarError("");
      setUploadingAvatar(true);

      // Kompres gambar
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 500,
        initialQuality: 0.8,
        useWebWorker: true,
      });

      setAvatarFile(compressedFile);

      // Buat preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setAvatarError("Gagal memproses gambar");
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      // Hapus dari storage jika ada URL
      if (user.avatar_url) {
        await fetch("/api/storage/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [user.avatar_url] }),
        });
      }

      // Update user dengan avatar_url kosong
      await updateUser(user.id, { avatar_url: "" });
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error("Remove avatar error:", err);
    }
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
            {showPassword ? (user.password.startsWith('$2') ? '•••••••••• (terenkripsi)' : user.password) : "••••••••••"}
          </span>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            title={showPassword ? "Sembunyikan" : "Tampilkan"}
            disabled={user.password.startsWith('$2')}
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
            <div className="relative inline-block">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-200/50">
                  {getInitials(user.name)}
                </div>
              )}
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                  title="Ganti foto profil"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
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
              
              {/* Avatar Upload */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || user.avatar_url) ? (
                    <img
                      src={avatarPreview || user.avatar_url || ""}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-xl font-bold">
                      {getInitials(user.name)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                    >
                      <Camera size={14} />
                      {avatarPreview ? "Ganti Foto" : "Upload Foto"}
                    </button>
                    {(avatarPreview || user.avatar_url) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  {avatarError && (
                    <p className="text-xs text-red-600 mt-1.5">{avatarError}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Maksimal 5MB, format: JPG, PNG, GIF</p>
                </div>
              </div>

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
      <div className="space-y-4">
        {["A", "B", "C", "D", "Dayshift"].map((r) => (
          <ReguTeam key={r} regu={r} />
        ))}
      </div>

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
        {hasDefaultPassword && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-start gap-2">
              <Lock size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Wajib untuk keamanan akun Anda</p>
                <p className="text-xs text-red-700 mt-1">
                  Password Anda saat ini masih menggunakan password default.
                  Segera ganti password untuk melindungi akun Anda dari akses yang tidak sah.
                </p>
              </div>
            </div>
          </div>
        )}
        <form id="resetForm" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password Saat Ini</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={resetForm.currentPassword}
                onChange={(e) => setResetForm({ ...resetForm, currentPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 pr-10 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="Masukkan password saat ini"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={resetForm.newPassword}
                onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                  resetForm.newPassword && (passwordValid ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10" : "border-red-300 focus:border-red-500 focus:ring-red-500/10")
                }`}
                placeholder="Minimal 8 karakter"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={resetForm.confirmPassword}
                onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-4 outline-none transition-all ${
                  resetForm.confirmPassword && (resetForm.newPassword === resetForm.confirmPassword ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10" : "border-red-300 focus:border-red-500 focus:ring-red-500/10")
                }`}
                placeholder="Ulangi password baru"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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

  const supervisors = members.filter((m) => m.role === "Supervisor");
  const operators = members.filter((m) => m.role === "Operator");

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

      {members.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">
          <UsersIcon size={24} className="mx-auto mb-2 opacity-50" />
          Belum ada personil
        </div>
      ) : regu === "Dayshift" ? (
        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-3 justify-center">
            {members.map((m) => (
              <DayshiftCard key={m.id} user={m} />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 overflow-x-auto">
          {supervisors.map((spv, idx) => {
            const teamOps = operators.filter((op) => op.regu === spv.regu);
            return (
              <div key={spv.id} className="flex flex-col items-center mb-6 last:mb-0">
                {/* Supervisor Card */}
                <div className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm min-w-[120px]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {getInitials(spv.name)}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-800">{spv.name}</p>
                    <span className="inline-block mt-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                      {spv.role}
                    </span>
                  </div>
                </div>

                {/* Connector line */}
                {teamOps.length > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-px h-4 bg-gray-300" />
                    <svg width={Math.min(teamOps.length, 4) * 100} height="10" className="text-gray-300">
                      {teamOps.length > 1 && (
                        <line x1="0" y1="0" x2={(teamOps.length - 1) * 100 + 2} y2="0" stroke="currentColor" strokeWidth="1.5" />
                      )}
                      {teamOps.map((_, i) => (
                        <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="5" stroke="currentColor" strokeWidth="1.5" />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Operator Cards */}
                {teamOps.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {teamOps.slice(0, 4).map((op) => (
                      <OperatorTreeCard key={op.id} user={op} />
                    ))}
                  </div>
                )}
                {teamOps.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">Tidak ada operator</p>
                )}

                {/* Separator antar supervisor */}
                {idx < supervisors.length - 1 && (
                  <div className="w-full border-t border-dashed border-gray-200 my-4" />
                )}
              </div>
            );
          })}
          {supervisors.length === 0 && operators.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {operators.map((op) => (
                <OperatorTreeCard key={op.id} user={op} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card Flat untuk Dayshift ──
function DayshiftCard({ user }: { user: { id: number; name: string; role: string; phone: string; unit: string; department: string } }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm min-w-[140px]">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${
        user.role === "Supervisor"
          ? "bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700"
          : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700"
      }`}>
        {getInitials(user.name)}
      </div>
      <p className="text-xs font-bold text-gray-800 text-center leading-tight">{user.name}</p>
      <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
        user.role === "Supervisor"
          ? "bg-cyan-100 text-cyan-700 border-cyan-200"
          : "bg-emerald-100 text-emerald-700 border-emerald-200"
      }`}>
        {user.role}
      </span>
      <div className="w-full mt-1 space-y-0.5">
        {user.phone && (
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <Phone size={8} className="shrink-0" />
            <span className="truncate">{user.phone}</span>
          </div>
        )}
        {user.unit && (
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <Building2 size={8} className="shrink-0" />
            <span className="truncate">{user.unit}</span>
          </div>
        )}
        {user.department && (
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <Building2 size={8} className="shrink-0" />
            <span className="truncate">{user.department}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Operator untuk Tree View ──
function OperatorTreeCard({ user }: { user: { id: number; name: string; role: string; phone: string; unit: string; department: string } }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm min-w-[100px]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
        {getInitials(user.name)}
      </div>
      <p className="text-[10px] font-semibold text-gray-800 text-center leading-tight">{user.name}</p>
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        {user.role}
      </span>
      <div className="w-full mt-0.5 space-y-0.5">
        {user.phone && (
          <div className="flex items-center gap-1 text-[8px] text-gray-500">
            <Phone size={7} className="shrink-0" />
            <span className="truncate">{user.phone}</span>
          </div>
        )}
        {user.unit && (
          <div className="flex items-center gap-1 text-[8px] text-gray-500">
            <Building2 size={7} className="shrink-0" />
            <span className="truncate">{user.unit}</span>
          </div>
        )}
        {user.department && (
          <div className="flex items-center gap-1 text-[8px] text-gray-500">
            <Building2 size={7} className="shrink-0" />
            <span className="truncate">{user.department}</span>
          </div>
        )}
      </div>
    </div>
  );
}
