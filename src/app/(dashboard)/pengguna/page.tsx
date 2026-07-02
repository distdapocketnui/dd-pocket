"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { User, UserRole, UserStatus } from "@/types";
import { getInitials, roleBadgeClass, statusUserBadgeClass, statusUserDotClass } from "@/lib/utils";
import { Plus, Eye, EyeOff, CheckCircle, X } from "lucide-react";

export default function PenggunaPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "Admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user?.role !== "Admin") return null;

  const { users, addUser, updateUser, deleteUser } = useData();
  const { hasRole, user: currentUser } = useAuth();
  const isAdmin = hasRole("Admin");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{
    name: string; email: string; phone: string; unit: string; department: string;
    username: string; password: string; role: UserRole; regu: string; status: UserStatus;
  }>({
    name: "", email: "", phone: "", unit: "", department: "", username: "", password: "", role: "Operator", regu: "", status: "Aktif",
  });

  const [showPassword, setShowPassword] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", email: "", phone: "", unit: "IT", department: "", username: "", password: "", role: "Operator", regu: "", status: "Aktif" });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, phone: u.phone, unit: u.unit, department: u.department, username: u.username, password: u.password, role: u.role, regu: u.regu, status: u.status });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      alert("Tidak dapat menghapus akun sendiri");
      return;
    }
    if (confirm("Yakin ingin menghapus pengguna ini?")) deleteUser(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      alert("Password minimal 8 karakter");
      return;
    }
    if (editId) {
      updateUser(editId, form);
    } else {
      addUser(form);
    }
    setModalOpen(false);
  };

  const columns = [
    {
      key: "name", header: "Nama Lengkap", render: (u: User) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(u.name)}
          </div>
          <span className="font-semibold">{u.name}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (u: User) => u.email },
    { key: "phone", header: "No. HP", render: (u: User) => u.phone || <span className="text-gray-300">—</span> },
    { key: "unit", header: "Unit Kerja", render: (u: User) => u.unit },
    { key: "department", header: "Departemen", render: (u: User) => u.department },
    { key: "username", header: "Username", render: (u: User) => u.username },
    { key: "password", header: "Password", render: () => <span className="text-gray-300 font-mono">••••••</span> },
    {
      key: "regu", header: "Regu", render: (u: User) => u.regu ? (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">{u.regu}</span>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "role", header: "Role", render: (u: User) => (
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${roleBadgeClass(u.role)}`}>{u.role}</span>
      ),
    },
    {
      key: "status", header: "Status", render: (u: User) => {
        const color = u.status === "Aktif" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200";
        const dot = u.status === "Aktif" ? "bg-green-600" : "bg-red-600";
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{u.status}
          </span>
        );
      },
    },
    {
      key: "actions", header: "Action", render: (u: User) => (
        isAdmin ? (
          <div className="flex gap-1.5">
            <button onClick={() => openEdit(u)} className="w-7 h-7 rounded flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => handleDelete(u.id)} className="w-7 h-7 rounded flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Hapus">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        ) : <span className="text-xs text-gray-400">—</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Pengguna</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola akun pengguna dan hak akses ke website.</p>
      </div>

      <DataTable
        title="Manajemen Pengguna"
        columns={columns}
        data={users}
        searchPlaceholder="Cari pengguna..."
        actions={
          isAdmin ? (
            <button onClick={openAdd} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={14} /> Tambah Pengguna
            </button>
          ) : undefined
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Pengguna" : "Tambah Pengguna"}
        footer={<button type="submit" form="userForm" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Simpan</button>}
      >
        <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Lengkap</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">No. Handphone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" placeholder="08xxx" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Kerja</label>
              <input type="text" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Departemen</label>
              <input type="text" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
              <input type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-xl bg-gray-50 text-sm focus:bg-white outline-none transition-all ${
                  form.password && (form.password.length >= 8 ? "border-emerald-400 focus:border-emerald-500" : "border-red-300 focus:border-red-500")
                }`} minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`flex items-center gap-1 text-xs transition-all ${
                  form.password.length >= 8 ? "text-emerald-600" : form.password.length > 0 ? "text-red-500" : "text-gray-400"
                }`}>
                  {form.password.length >= 8 ? <CheckCircle size={12} /> : <X size={12} />}
                  <span>Minimal 8 karakter</span>
                </div>
                {form.password.length > 0 && (
                  <span className={`text-[10px] font-medium ${form.password.length >= 8 ? "text-emerald-500" : "text-red-400"}`}>
                    ({form.password.length}/8)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all">
                <option value="Admin">Admin</option><option value="Manager">Manager</option><option value="Supervisor">Supervisor</option><option value="Operator">Operator</option><option value="Visitor">Visitor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Regu</label>
              <select value={form.regu} onChange={(e) => setForm({ ...form, regu: e.target.value })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all">
                <option value="">— Pilih —</option>
                <option value="A">Regu A</option>
                <option value="B">Regu B</option>
                <option value="C">Regu C</option>
                <option value="D">Regu D</option>
                <option value="Dayshift">Dayshift</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all">
                <option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
