-- ============================================================
-- Migration: Add finish_time to switch_gears
-- Menambahkan kolom waktu selesai pada tabel switch_gears
-- ============================================================

ALTER TABLE switch_gears
ADD COLUMN IF NOT EXISTS finish_time TEXT NOT NULL DEFAULT '';
