-- ELECOM committee flag (promoted members get admin access via member login)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_elecom BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_members_is_elecom ON members(is_elecom) WHERE is_elecom = true;
