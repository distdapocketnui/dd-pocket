-- Laporan P2B — Pengaturan Beban & Inspeksi Rutin
CREATE TABLE IF NOT EXISTS laporan_p2b (
  id BIGSERIAL PRIMARY KEY,
  tanggal_jam TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lokasi TEXT NOT NULL,
  posisi_power TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL,
  pic TEXT NOT NULL,
  kegiatan TEXT NOT NULL,
  kondisi TEXT NOT NULL DEFAULT '',
  temuan TEXT DEFAULT '',
  tindak_lanjut TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  nama TEXT NOT NULL DEFAULT '',
  regu TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom kondisi pada tabel yang sudah ada
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS kondisi TEXT NOT NULL DEFAULT '';

-- Nonaktifkan RLS — kontrol akses ditangani di kode aplikasi
ALTER TABLE laporan_p2b DISABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS level_tegangan TEXT NOT NULL DEFAULT '';
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS unit_pindah TEXT NOT NULL DEFAULT '';
ALTER TABLE laporan_p2b ADD COLUMN IF NOT EXISTS aktifitas TEXT NOT NULL DEFAULT '';
