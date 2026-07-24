-- Add new columns for P2B: shift, update_beban_pln, update_beban_btg
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS shift TEXT NOT NULL DEFAULT '';
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS update_beban_pln NUMERIC;
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS update_beban_btg NUMERIC;
