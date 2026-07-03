-- Multi-file images: tambah kolom images (JSON array) ke tabel yang punya kolom image
-- Kolom image (TEXT) tetap ada untuk backward compatibility

ALTER TABLE switch_gears ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]';
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]';

-- Migrasi data lama: isi images dari kolom image yang sudah ada
UPDATE switch_gears
SET images = CASE
  WHEN image IS NOT NULL AND image != '' THEN jsonb_build_array(image)::text
  ELSE '[]'::text
END
WHERE images = '[]' OR images IS NULL;

UPDATE laporan_p2b
SET images = CASE
  WHEN image IS NOT NULL AND image != '' THEN jsonb_build_array(image)::text
  ELSE '[]'::text
END
WHERE images = '[]' OR images IS NULL;
