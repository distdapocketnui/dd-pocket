-- ============================================================
-- ADD reason COLUMN TO change_approvals
-- ============================================================
ALTER TABLE change_approvals ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
