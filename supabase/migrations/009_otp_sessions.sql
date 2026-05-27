-- OTP sessions for member login (Worker service_role only; not exposed to clients)

-- No anon/authenticated policies — only service_role (Worker) can access

GRANT ALL ON public.otp_sessions TO service_role;
CREATE TABLE IF NOT EXISTS otp_sessions (
  id            UUID PRIMARY KEY,
  license_hash  TEXT NOT NULL,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  otp           TEXT NOT NULL,
  contact       TEXT NOT NULL,
  member_name   TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires ON otp_sessions(expires_at);

ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

