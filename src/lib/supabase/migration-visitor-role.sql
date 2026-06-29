-- ============================================================
-- Migration: Add Visitor role
-- ============================================================

-- 1. Drop old CHECK constraint and add new one with Visitor
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('Admin', 'Manager', 'Operator', 'Visitor'));

-- 2. Insert sample visitor user (skip if already exists)
INSERT INTO users (name, email, unit, department, username, password, role, status)
VALUES ('Tamu Visitasi', 'visitor@ddpocket.com', 'Umum', 'Umum', 'visitor', 'visitor123', 'Visitor', 'Aktif')
ON CONFLICT (username) DO NOTHING;
