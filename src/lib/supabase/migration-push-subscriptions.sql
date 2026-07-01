-- Push Notification Subscriptions
-- Digunakan untuk menyimpan endpoint Web Push subscription dari setiap browser/perangkat
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  username TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup by username
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_username ON push_subscriptions(username);
