-- ============================================================
-- DD-Pocket Seed Data
-- ============================================================

-- USERS
INSERT INTO users (name, email, phone, unit, department, username, password, role, regu, status) VALUES
  ('Admin Utama', 'admin@ddpocket.com', '081234567890', 'IT', 'Teknologi Informasi', 'admin', 'admin123', 'Admin', '', 'Aktif'),
  ('Manajer Operasi', 'manager@ddpocket.com', '081234567891', 'Operasi', 'Produksi', 'manager', 'manager123', 'Manager', '', 'Aktif'),
  ('Operator Lapangan', 'operator@ddpocket.com', '081234567892', 'Produksi', 'Produksi', 'operator', 'operator123', 'Operator', 'A', 'Aktif'),
  ('Budi Santoso', 'budi@ddpocket.com', '', 'Tonasa 2/3', 'Teknik', 'budi', 'budi123', 'Operator', 'B', 'Aktif'),
  ('Citra Dewi', 'citra@ddpocket.com', '', 'Tonasa 4', 'Teknik', 'citra', 'citra123', 'Operator', 'C', 'Aktif'),
  ('Eko Prasetyo', 'eko@ddpocket.com', '', 'Tonasa 5', 'Produksi', 'eko', 'eko123', 'Operator', 'D', 'Nonaktif'),
  ('Fajar Nugroho', 'fajar@ddpocket.com', '081234567893', 'IT', 'Teknologi Informasi', 'fajar', 'fajar123', 'Manager', '', 'Aktif')
ON CONFLICT (username) DO NOTHING;

-- SWITCH GEARS
INSERT INTO switch_gears (name, location, unit, status, pic, requester, active_time, finish_time, notif_no, lototo_no, image, description) VALUES
  ('SG-MV-01', 'Area Transformer T2/3', 'Tonasa 2/3', 'Aktif Lototo', 'Ahmad Fauzi', 'Budi Santoso', '2026-06-25 08:30', '', 'NOTIF-2026-001', 'LT-2026-001', '', 'Pengamanan switch gear untuk area transformator'),
  ('SG-MV-02', 'Area Kiln T4', 'Tonasa 4', 'Maintenance', 'Rudi Hermawan', 'Citra Dewi', '2026-06-24 14:00', '', 'NOTIF-2026-002', 'LT-2026-002', '', 'Perbaikan panel kontrol'),
  ('SG-LV-01', 'Area Packer T5', 'Tonasa 5', 'Selesai', 'Dian Permata', 'Eko Prasetyo', '2026-06-23 09:15', '2026-06-23 16:30', 'NOTIF-2026-003', 'LT-2026-003', '', 'Penggantian komponen rusak'),
  ('SG-MV-03', 'Area Crusher', 'Tonasa 2/3', 'Aktif Lototo', 'Fajar Nugroho', 'Gilang Ramadhan', '2026-06-25 10:00', '', 'NOTIF-2026-004', 'LT-2026-004', '', 'Lockout tagout untuk perawatan crusher'),
  ('SG-LV-02', 'Area Raw Mill', 'Tonasa 4', 'Maintenance', 'Hendra Gunawan', 'Indra Lesmana', '2026-06-24 16:30', '', 'NOTIF-2026-005', 'LT-2026-005', '', 'Perbaikan sistem kelistrikan'),
  ('SG-MV-04', 'Area Finish Mill', 'Tonasa 5', 'Aktif Lototo', 'Joko Susilo', 'Kurniawan', '2026-06-25 07:45', '', 'NOTIF-2026-006', 'LT-2026-006', '', 'Pengamanan area finish mill'),
  ('SG-LV-03', 'Area Loading', 'SG Lainnya', 'Selesai', 'Lestari', 'Mega Sari', '2026-06-22 11:00', '2026-06-22 15:00', 'NOTIF-2026-007', 'LT-2026-007', '', 'Perawatan rutin'),
  ('SG-MV-05', 'Area Coal Mill', 'Tonasa 2/3', 'Maintenance', 'Nurhayati', 'Omar Dani', '2026-06-24 08:00', '', 'NOTIF-2026-008', 'LT-2026-008', '', 'Overhaul panel utama')
ON CONFLICT DO NOTHING;

-- ACTIVITY LOGS
INSERT INTO activity_logs (action, "user", page, timestamp, details) VALUES
  ('Login', 'Admin Utama', 'Dashboard', '2026-06-25 08:00', 'User login ke sistem'),
  ('Tambah SG', 'Admin Utama', 'Switch Gear', '2026-06-25 08:15', 'Menambahkan SG-MV-01'),
  ('Edit SG', 'Manajer Operasi', 'Switch Gear', '2026-06-25 09:00', 'Mengubah data SG-LV-01'),
  ('Hapus SG', 'Admin Utama', 'Switch Gear', '2026-06-25 09:30', 'Menghapus SG-Test'),
  ('Aktifkan LOTOTO', 'Operator Lapangan', 'Lototo', '2026-06-25 10:00', 'Mengaktifkan LOTOTO untuk SG-MV-03'),
  ('Update Status', 'Budi Santoso', 'SG Maintenance', '2026-06-25 10:30', 'Mengubah status SG-MV-02 ke Maintenance'),
  ('Tambah User', 'Admin Utama', 'Pengguna', '2026-06-25 11:00', 'Menambahkan user baru: Fajar Nugroho'),
  ('Edit User', 'Admin Utama', 'Pengguna', '2026-06-25 11:30', 'Mengubah data user: Citra Dewi'),
  ('Login', 'Fajar Nugroho', 'Dashboard', '2026-06-25 12:00', 'User login ke sistem'),
  ('Selesaikan LOTOTO', 'Operator Lapangan', 'Lototo', '2026-06-25 13:00', 'Menyelesaikan LOTOTO untuk SG-LV-01'),
  ('Export Laporan', 'Manajer Operasi', 'Laporan Harian', '2026-06-25 14:00', 'Export laporan harian periode 24-25 Juni 2026'),
  ('Login', 'Operator Lapangan', 'Dashboard', '2026-06-25 14:30', 'User login ke sistem')
ON CONFLICT DO NOTHING;
