-- Dashboard auth tables: users, sessions, login codes
-- Replaces S3-backed JSON auth (ssi-audio-stage/auth/)

-- Dashboard users
CREATE TABLE IF NOT EXISTS dashboard_users (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'recorder' CHECK (role IN ('recorder', 'editor', 'admin')),
  courses JSONB NOT NULL DEFAULT '"*"',
  voice_id TEXT,
  invited_by TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS dashboard_sessions (
  session_id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES dashboard_users(email) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Login codes (reusable until expiry)
CREATE TABLE IF NOT EXISTS dashboard_login_codes (
  code TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES dashboard_users(email) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_email ON dashboard_sessions(email);
CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_expires ON dashboard_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_login_codes_email ON dashboard_login_codes(email);
CREATE INDEX IF NOT EXISTS idx_dashboard_login_codes_expires ON dashboard_login_codes(expires_at);

-- RLS: service_role full access (dashboard uses service key)
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_login_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_dashboard_users" ON dashboard_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_dashboard_sessions" ON dashboard_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_dashboard_login_codes" ON dashboard_login_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed admin user
INSERT INTO dashboard_users (email, name, role, courses)
VALUES ('thomas.cassidy+ssi@gmail.com', 'Tom', 'admin', '"*"')
ON CONFLICT (email) DO NOTHING;
