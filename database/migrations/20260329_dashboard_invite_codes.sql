-- Invite codes for Popty dashboard access
-- Admin generates a code, sends it to someone, they redeem it to get access.

CREATE TABLE IF NOT EXISTS dashboard_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'recorder' CHECK (role IN ('recorder', 'editor', 'admin')),
  courses JSONB NOT NULL DEFAULT '[]',
  label TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  redemptions JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_invite_codes_code ON dashboard_invite_codes(code);
