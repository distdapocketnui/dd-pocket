-- ============================================================
-- Migration: Add regu column to users & change_approvals
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS regu TEXT DEFAULT '';

ALTER TABLE change_approvals ADD COLUMN IF NOT EXISTS regu TEXT DEFAULT '';
