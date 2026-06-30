import { SwitchGear, User, ActivityLog } from "@/types";

export const SAMPLE_SWITCH_GEARS: SwitchGear[] = [
  { id: 1, name: "SG-MV-01", location: "Area Transformer T2/3", unit: "Tonasa 2/3", status: "Aktif Lototo", pic: "Ahmad Fauzi", requester: "Budi Santoso", activeTime: "2026-06-25 08:30", finishTime: "", notifNo: "NOTIF-2026-001", lototoNo: "LT-2026-001", image: "", description: "Pengamanan switch gear untuk area transformator" },
  { id: 2, name: "SG-MV-02", location: "Area Kiln T4", unit: "Tonasa 4", status: "Maintenance", pic: "Rudi Hermawan", requester: "Citra Dewi", activeTime: "2026-06-24 14:00", finishTime: "", notifNo: "NOTIF-2026-002", lototoNo: "LT-2026-002", image: "", description: "Perbaikan panel kontrol" },
  { id: 3, name: "SG-LV-01", location: "Area Packer T5", unit: "Tonasa 5", status: "Selesai", pic: "Dian Permata", requester: "Eko Prasetyo", activeTime: "2026-06-23 09:15", finishTime: "2026-06-23 16:30", notifNo: "NOTIF-2026-003", lototoNo: "LT-2026-003", image: "", description: "Penggantian komponen rusak" },
  { id: 4, name: "SG-MV-03", location: "Area Crusher", unit: "Tonasa 2/3", status: "Aktif Lototo", pic: "Fajar Nugroho", requester: "Gilang Ramadhan", activeTime: "2026-06-25 10:00", finishTime: "", notifNo: "NOTIF-2026-004", lototoNo: "LT-2026-004", image: "", description: "Lockout tagout untuk perawatan crusher" },
  { id: 5, name: "SG-LV-02", location: "Area Raw Mill", unit: "Tonasa 4", status: "Maintenance", pic: "Hendra Gunawan", requester: "Indra Lesmana", activeTime: "2026-06-24 16:30", finishTime: "", notifNo: "NOTIF-2026-005", lototoNo: "LT-2026-005", image: "", description: "Perbaikan sistem kelistrikan" },
  { id: 6, name: "SG-MV-04", location: "Area Finish Mill", unit: "Tonasa 5", status: "Aktif Lototo", pic: "Joko Susilo", requester: "Kurniawan", activeTime: "2026-06-25 07:45", finishTime: "", notifNo: "NOTIF-2026-006", lototoNo: "LT-2026-006", image: "", description: "Pengamanan area finish mill" },
  { id: 7, name: "SG-LV-03", location: "Area Loading", unit: "SG Lainnya", status: "Selesai", pic: "Lestari", requester: "Mega Sari", activeTime: "2026-06-22 11:00", finishTime: "2026-06-22 15:00", notifNo: "NOTIF-2026-007", lototoNo: "LT-2026-007", image: "", description: "Perawatan rutin" },
  { id: 8, name: "SG-MV-05", location: "Area Coal Mill", unit: "Tonasa 2/3", status: "Maintenance", pic: "Nurhayati", requester: "Omar Dani", activeTime: "2026-06-24 08:00", finishTime: "", notifNo: "NOTIF-2026-008", lototoNo: "LT-2026-008", image: "", description: "Overhaul panel utama" },
];

export const SAMPLE_USERS: User[] = [
  { id: 1, name: "Admin Utama", email: "admin@ddpocket.com", phone: "081234567890", unit: "IT", department: "Teknologi Informasi", username: "admin", password: "admin123", role: "Admin", regu: "", status: "Aktif" },
  { id: 2, name: "Manajer Operasi", email: "manager@ddpocket.com", phone: "081234567891", unit: "Operasi", department: "Produksi", username: "manager", password: "manager123", role: "Manager", regu: "", status: "Aktif" },
  { id: 3, name: "Operator Lapangan", email: "operator@ddpocket.com", phone: "081234567892", unit: "Produksi", department: "Produksi", username: "operator", password: "operator123", role: "Operator", regu: "A", status: "Aktif" },
  { id: 4, name: "Budi Santoso", email: "budi@ddpocket.com", phone: "", unit: "Tonasa 2/3", department: "Teknik", username: "budi", password: "budi123", role: "Operator", regu: "B", status: "Aktif" },
  { id: 5, name: "Citra Dewi", email: "citra@ddpocket.com", phone: "", unit: "Tonasa 4", department: "Teknik", username: "citra", password: "citra123", role: "Operator", regu: "C", status: "Aktif" },
  { id: 6, name: "Eko Prasetyo", email: "eko@ddpocket.com", phone: "", unit: "Tonasa 5", department: "Produksi", username: "eko", password: "eko123", role: "Operator", regu: "D", status: "Nonaktif" },
  { id: 7, name: "Fajar Nugroho", email: "fajar@ddpocket.com", phone: "081234567893", unit: "IT", department: "Teknologi Informasi", username: "fajar", password: "fajar123", role: "Manager", regu: "", status: "Aktif" },
];

export const SAMPLE_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 1, action: "Login", user: "Admin Utama", page: "Dashboard", timestamp: "2026-06-25 08:00", details: "User login ke sistem" },
  { id: 2, action: "Tambah SG", user: "Admin Utama", page: "Switch Gear", timestamp: "2026-06-25 08:15", details: "Menambahkan SG-MV-01" },
  { id: 3, action: "Edit SG", user: "Manajer Operasi", page: "Switch Gear", timestamp: "2026-06-25 09:00", details: "Mengubah data SG-LV-01" },
  { id: 4, action: "Hapus SG", user: "Admin Utama", page: "Switch Gear", timestamp: "2026-06-25 09:30", details: "Menghapus SG-Test" },
  { id: 5, action: "Aktifkan LOTOTO", user: "Operator Lapangan", page: "Lototo", timestamp: "2026-06-25 10:00", details: "Mengaktifkan LOTOTO untuk SG-MV-03" },
  { id: 6, action: "Update Status", user: "Budi Santoso", page: "SG Maintenance", timestamp: "2026-06-25 10:30", details: "Mengubah status SG-MV-02 ke Maintenance" },
  { id: 7, action: "Tambah User", user: "Admin Utama", page: "Pengguna", timestamp: "2026-06-25 11:00", details: "Menambahkan user baru: Fajar Nugroho" },
  { id: 8, action: "Edit User", user: "Admin Utama", page: "Pengguna", timestamp: "2026-06-25 11:30", details: "Mengubah data user: Citra Dewi" },
  { id: 9, action: "Login", user: "Fajar Nugroho", page: "Dashboard", timestamp: "2026-06-25 12:00", details: "User login ke sistem" },
  { id: 10, action: "Selesaikan LOTOTO", user: "Operator Lapangan", page: "Lototo", timestamp: "2026-06-25 13:00", details: "Menyelesaikan LOTOTO untuk SG-LV-01" },
  { id: 11, action: "Export Laporan", user: "Manajer Operasi", page: "Laporan Harian", timestamp: "2026-06-25 14:00", details: "Export laporan harian periode 24-25 Juni 2026" },
  { id: 12, action: "Login", user: "Operator Lapangan", page: "Dashboard", timestamp: "2026-06-25 14:30", details: "User login ke sistem" },
];
