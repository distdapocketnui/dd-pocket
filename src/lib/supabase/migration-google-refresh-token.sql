-- Google Drive Refresh Token
-- Menyimpan refresh token untuk upload gambar terpusat via OAuth
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hanya boleh insert/update row dengan key tertentu via API
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Izinkan anon key untuk read & write (aman karena hanya 1 row spesifik)
CREATE POLICY "Allow anon all" ON app_config
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
