-- Member position and agency (registration)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS agency_name TEXT;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_position_check;
ALTER TABLE members
  ADD CONSTRAINT members_position_check
  CHECK (
    position IS NULL
    OR position IN ('Agency Director', 'District Director')
  );
