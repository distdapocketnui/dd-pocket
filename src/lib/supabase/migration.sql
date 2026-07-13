-- ============================================================
-- DD-Pocket Database Migration
-- Database: Supabase (PostgreSQL)
-- Tables: users, switch_gears, activity_logs
-- ============================================================

-- 1. USERS TABLE
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
  regu TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SWITCH GEARS TABLE
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
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  "user" TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  timestamp TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_switch_gears_status ON switch_gears(status);
CREATE INDEX IF NOT EXISTS idx_switch_gears_unit ON switch_gears(unit);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 5. AUTO-UPDATE updated_at TRIGGER
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

-- 6. ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE switch_gears ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

DROP POLICY IF EXISTS "Users can read all switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can insert switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can update switch_gears" ON switch_gears;
DROP POLICY IF EXISTS "Users can delete switch_gears" ON switch_gears;

DROP POLICY IF EXISTS "Users can read all activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can delete activity_logs" ON activity_logs;

-- USERS policies
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update users"
  ON users FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete users"
  ON users FOR DELETE
  USING (true);

-- SWITCH GEARS policies
CREATE POLICY "Users can read all switch_gears"
  ON switch_gears FOR SELECT
  USING (true);

CREATE POLICY "Users can insert switch_gears"
  ON switch_gears FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update switch_gears"
  ON switch_gears FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete switch_gears"
  ON switch_gears FOR DELETE
  USING (true);

-- ACTIVITY LOGS policies
CREATE POLICY "Users can read all activity_logs"
  ON activity_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete activity_logs"
  ON activity_logs FOR DELETE
  USING (true);

-- ============================================================
-- 7. CHANGE APPROVALS TABLE (untuk workflow approval operator)
-- ============================================================
CREATE TABLE IF NOT EXISTS change_approvals (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id BIGINT NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL CHECK (action_type IN ('edit', 'delete', 'create')),
  old_data JSONB,
  new_data JSONB,
  regu TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by BIGINT NOT NULL REFERENCES users(id),
  requested_by_name TEXT NOT NULL DEFAULT '',
  reviewed_by BIGINT REFERENCES users(id),
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_approvals_status ON change_approvals(status);
CREATE INDEX IF NOT EXISTS idx_change_approvals_requested_by ON change_approvals(requested_by);

-- ============================================================
-- 8. ALTER TABLE untuk database yang sudah ada (dijalankan manual)
--    jika tabel sudah dibuat dengan migration versi lama
-- ============================================================
-- -- Tambah kolom finish_time jika belum ada
-- ALTER TABLE switch_gears ADD COLUMN IF NOT EXISTS finish_time TEXT NOT NULL DEFAULT '';
--
-- -- Update CHECK constraint status — include 'Aktif Lototo'
-- ALTER TABLE switch_gears DROP CONSTRAINT IF EXISTS switch_gears_status_check;
-- ALTER TABLE switch_gears ADD CONSTRAINT switch_gears_status_check
--   CHECK (status IN ('Aktif Lototo', 'Maintenance', 'Selesai'));
-- ALTER TABLE switch_gears ALTER COLUMN status SET DEFAULT 'Aktif Lototo';
--
-- -- Tambah role Supervisor & Visitor ke users
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('Admin', 'Manager', 'Operator', 'Supervisor', 'Visitor'));
--
-- -- Tambah kolom regu jika belum ada
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS regu TEXT NOT NULL DEFAULT '';
--
