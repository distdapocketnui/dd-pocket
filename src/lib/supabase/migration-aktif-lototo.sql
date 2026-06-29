-- ============================================================
-- Migration: Change status value "Aktif" to "Aktif Lototo"
-- ============================================================

-- 1. Update existing data
UPDATE switch_gears SET status = 'Aktif Lototo' WHERE status = 'Aktif';

-- 2. Drop old CHECK constraint and add new one
ALTER TABLE switch_gears DROP CONSTRAINT IF EXISTS switch_gears_status_check;
ALTER TABLE switch_gears ADD CONSTRAINT switch_gears_status_check
  CHECK (status IN ('Aktif Lototo', 'Maintenance', 'Selesai'));

-- 3. Update default value
ALTER TABLE switch_gears ALTER COLUMN status SET DEFAULT 'Aktif Lototo';
