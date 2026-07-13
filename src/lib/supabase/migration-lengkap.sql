-- ============================================================
-- DD-Pocket — FULL DATABASE MIGRATION (All-in-One)
-- Jalankan SEKALI di Supabase SQL Editor
-- ============================================================

-- ===================== TABEL UTAMA =====================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Operator', 'Supervisor', 'Visitor')),
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  regu TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SWITCH GEARS
CREATE TABLE IF NOT EXISTS switch_gears (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aktif Lototo' CHECK (status IN ('Aktif Lototo', 'Maintenance', 'Selesai')),
  pic TEXT NOT NULL DEFAULT '',
  requester TEXT NOT NULL DEFAULT '',
  active_time TEXT NOT NULL DEFAULT '',
  finish_time TEXT NOT NULL DEFAULT '',
  notif_no TEXT NOT NULL DEFAULT '',
  lototo_no TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  images TEXT DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LAPORAN P2B
CREATE TABLE IF NOT EXISTS laporan_p2b (
  id BIGSERIAL PRIMARY KEY,
  tanggal_jam TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lokasi TEXT NOT NULL,
  posisi_power TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL,
  pic TEXT NOT NULL,
  kegiatan TEXT NOT NULL,
  kondisi TEXT NOT NULL DEFAULT 'Normal',
  temuan TEXT DEFAULT '',
  tindak_lanjut TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  nama TEXT NOT NULL DEFAULT '',
  regu TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  level_tegangan TEXT NOT NULL DEFAULT '',
  unit_pindah TEXT NOT NULL DEFAULT '',
  aktifitas TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  images TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UNIT PENGATURAN (dropdown Unit Pindah)
CREATE TABLE IF NOT EXISTS unit_pengaturan (
  id BIGSERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);

INSERT INTO unit_pengaturan (nama) VALUES
  ('CRUSHER 4 + R.MILL 411'),
  ('R.MILL 412'),
  ('F.MILL 419'),
  ('F.MILL 420'),
  ('KILN 4 + NEW C.MILL (ATOX) + C.MILL (LOESCHE)'),
  ('CRUSHER 5'),
  ('F.MILL 552'),
  ('F.MILL 553'),
  ('R.MILL 5'),
  ('KILN 5 + C,MILL 5'),
  ('F.MILL 2'),
  ('F.MILL 3'),
  ('CRUSHER 2'),
  ('R.MILL 2'),
  ('R.MILL 3'),
  ('KILN 2'),
  ('KILN 3'),
  ('TONASA 2/3')
ON CONFLICT (nama) DO NOTHING;

-- 5. PUSH SUBSCRIPTIONS (notifikasi)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  username TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CHANGE APPROVALS (workflow approval operator)
CREATE TABLE IF NOT EXISTS change_approvals (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id BIGINT NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL CHECK (action_type IN ('edit', 'delete', 'create')),
  old_data JSONB,
  new_data JSONB,
  regu TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by BIGINT NOT NULL REFERENCES users(id),
  requested_by_name TEXT NOT NULL DEFAULT '',
  reviewed_by BIGINT REFERENCES users(id),
  review_notes TEXT DEFAULT '',
  target_supervisor_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. APP CONFIG (Google Drive refresh token dll)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== DROP TABEL TIDAK DIPAKAI =====================

DROP TABLE IF EXISTS activity_logs CASCADE;

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_switch_gears_status ON switch_gears(status);
CREATE INDEX IF NOT EXISTS idx_switch_gears_unit ON switch_gears(unit);
CREATE INDEX IF NOT EXISTS idx_change_approvals_status ON change_approvals(status);
CREATE INDEX IF NOT EXISTS idx_change_approvals_created_at ON change_approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_username ON push_subscriptions(username);

-- ===================== TRIGGER (auto-update updated_at) =====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_switch_gears_updated_at ON switch_gears;
CREATE TRIGGER trigger_switch_gears_updated_at
  BEFORE UPDATE ON switch_gears
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_change_approvals_updated_at ON change_approvals;
CREATE TRIGGER trigger_change_approvals_updated_at
  BEFORE UPDATE ON change_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================== ROW LEVEL SECURITY =====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE switch_gears ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_p2b DISABLE ROW LEVEL SECURITY;

-- App config policy
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all" ON app_config;
CREATE POLICY "Allow anon all" ON app_config
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Users policies
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can delete users" ON users FOR DELETE USING (true);

-- Switch gears policies
DROP POLICY IF EXISTS "Users can read all switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can insert switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can update switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can delete switch_gears" ON switch_gears;

CREATE POLICY "Users can read all switch_gears" ON switch_gears FOR SELECT USING (true);
CREATE POLICY "Users can insert switch_gears" ON switch_gears FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update switch_gears" ON switch_gears FOR UPDATE USING (true);
CREATE POLICY "Users can delete switch_gears" ON switch_gears FOR DELETE USING (true);

-- Change approvals policies
DROP POLICY IF EXISTS "Users can read change_approvals" ON change_approvals;
DROP POLICY IF EXISTS "Users can insert change_approvals" ON change_approvals;
DROP POLICY IF EXISTS "Users can update change_approvals" ON change_approvals;
DROP POLICY IF EXISTS "Users can delete change_approvals" ON change_approvals;

CREATE POLICY "Users can read change_approvals" ON change_approvals FOR SELECT USING (true);
CREATE POLICY "Users can insert change_approvals" ON change_approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update change_approvals" ON change_approvals FOR UPDATE USING (true);
CREATE POLICY "Users can delete change_approvals" ON change_approvals FOR DELETE USING (true);

-- ===================== STORAGE SETUP =====================

INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Authenticated Select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() = owner);

-- ===================== SEED DATA (AKUN DEMO) =====================

INSERT INTO users (name, email, unit, department, username, password, role, status, regu) VALUES
  ('Admin Utama', 'admin@ddpocket.com', 'IT', 'Teknologi Informasi', 'admin', 'admin123', 'Admin', 'Aktif', ''),
  ('Manajer Operasi', 'manager@ddpocket.com', 'Operasi', 'Produksi', 'manager', 'manager123', 'Manager', 'Aktif', ''),
  ('Operator Lapangan', 'operator@ddpocket.com', 'Produksi', 'Produksi', 'operator', 'operator123', 'Operator', 'Aktif', ''),
  ('Budi Santoso', 'budi@ddpocket.com', 'Tonasa 2/3', 'Teknik', 'budi', 'budi123', 'Operator', 'Aktif', 'Regu A'),
  ('Citra Dewi', 'citra@ddpocket.com', 'Tonasa 4', 'Teknik', 'citra', 'citra123', 'Operator', 'Aktif', 'Regu B'),
  ('Eko Prasetyo', 'eko@ddpocket.com', 'Tonasa 5', 'Produksi', 'eko', 'eko123', 'Operator', 'Nonaktif', 'Regu A'),
  ('Fajar Nugroho', 'fajar@ddpocket.com', 'IT', 'Teknologi Informasi', 'fajar', 'fajar123', 'Manager', 'Aktif', ''),
  ('Supervisor Satu', 'supervisor@ddpocket.com', 'Tonasa 4', 'Produksi', 'supervisor', 'supervisor123', 'Supervisor', 'Aktif', 'Regu A'),
  ('Pengunjung', 'visitor@ddpocket.com', 'Umum', 'Tamu', 'visitor', 'visitor123', 'Visitor', 'Aktif', '')
ON CONFLICT (username) DO NOTHING;

INSERT INTO switch_gears (name, location, unit, status, pic, requester, active_time, finish_time, notif_no, lototo_no, image, description) VALUES
  ('SG-MV-01', 'Area Transformer T2/3', 'Tonasa 2/3', 'Aktif Lototo', 'Ahmad Fauzi', 'Budi Santoso', '2026-06-25 08:30', '', 'NOTIF-2026-001', 'LT-2026-001', '', 'Pengamanan switch gear untuk area transformator'),
  ('SG-MV-02', 'Area Kiln T4', 'Tonasa 4', 'Maintenance', 'Rudi Hermawan', 'Citra Dewi', '2026-06-24 14:00', '', 'NOTIF-2026-002', 'LT-2026-002', '', 'Perbaikan panel kontrol'),
  ('SG-LV-01', 'Area Packer T5', 'Tonasa 5', 'Selesai', 'Dian Permata', 'Eko Prasetyo', '2026-06-23 09:15', '2026-06-24 09:15', 'NOTIF-2026-003', 'LT-2026-003', '', 'Penggantian komponen rusak'),
  ('SG-MV-03', 'Area Crusher', 'Tonasa 2/3', 'Aktif Lototo', 'Fajar Nugroho', 'Gilang Ramadhan', '2026-06-25 10:00', '', 'NOTIF-2026-004', 'LT-2026-004', '', 'Lockout tagout untuk perawatan crusher'),
  ('SG-LV-02', 'Area Raw Mill', 'Tonasa 4', 'Maintenance', 'Hendra Gunawan', 'Indra Lesmana', '2026-06-24 16:30', '', 'NOTIF-2026-005', 'LT-2026-005', '', 'Perbaikan sistem kelistrikan'),
  ('SG-MV-04', 'Area Finish Mill', 'Tonasa 5', 'Aktif Lototo', 'Joko Susilo', 'Kurniawan', '2026-06-25 07:45', '', 'NOTIF-2026-006', 'LT-2026-006', '', 'Pengamanan area finish mill'),
  ('SG-LV-03', 'Area Loading', 'SG Lainnya', 'Selesai', 'Lestari', 'Mega Sari', '2026-06-22 11:00', '2026-06-23 11:00', 'NOTIF-2026-007', 'LT-2026-007', '', 'Perawatan rutin'),
  ('SG-MV-05', 'Area Coal Mill', 'Tonasa 2/3', 'Maintenance', 'Nurhayati', 'Omar Dani', '2026-06-24 08:00', '', 'NOTIF-2026-008', 'LT-2026-008', '', 'Overhaul panel utama')
ON CONFLICT DO NOTHING;

-- ===================== SELESAI =====================
