// ===== Type Definitions =====

export type SGStatus = "Aktif Lototo" | "Maintenance" | "Selesai";

export interface UnitPengaturan {
  id: number;
  nama: string;
}
export type UserRole = "Admin" | "Manager" | "Operator" | "Supervisor" | "Visitor";
export type UserStatus = "Aktif" | "Nonaktif";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalAction = "edit" | "delete" | "create";

export interface SwitchGear {
  id: number;
  name: string;
  location: string;
  unit: string;
  status: SGStatus;
  pic: string;
  requester: string;
  activeTime: string;
  finishTime: string;
  notifNo: string;
  lototoNo: string;
  image: string;
  images: string;
  description: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  unit: string;
  department: string;
  username: string;
  password: string;
  role: UserRole;
  regu: string;
  status: UserStatus;
}

export interface ChangeApproval {
  id: number;
  table_name: string;
  record_id: number;
  action_type: ApprovalAction;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  regu: string;
  status: ApprovalStatus;
  requested_by: number;
  requested_by_name: string;
  target_supervisor_id: number | null;
  reviewed_by: number | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  user: string;
  page: string;
  timestamp: string;
  details: string;
}

export interface StatsData {
  total: number;
  aktif: number;
  maintenance: number;
  selesai: number;
}

export interface LaporanP2B {
  id: number;
  tanggal_jam: string;
  lokasi: string;
  posisi_power: "" | "BTG" | "PLN" | "PLN ke BTG" | "BTG ke PLN";
  level_tegangan: "" | "70 kV" | "6,3 kV";
  unit_pindah: string;
  aktifitas: string;
  area: string;
  pic: string;
  kegiatan: "Pengaturan Beban" | "Inspeksi" | "Lainnya";
  kondisi: "" | "Normal" | "Rusak" | "Perbaikan";
  temuan: string;
  tindak_lanjut: string;
  keterangan: string;
  image: string;
  images: string;
  nama: string;
  regu: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
