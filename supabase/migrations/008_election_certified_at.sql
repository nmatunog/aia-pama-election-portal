-- Timestamp when ELECOM certifies results (official announcement)
ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ;
