-- Member roster: ELECOM-approved signups + admin tooling

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_approval_status_check;
ALTER TABLE members
  ADD CONSTRAINT members_approval_status_check
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

UPDATE members SET approval_status = 'approved' WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_approval_status ON members(approval_status);
