-- Phase 2: nomination query performance

CREATE INDEX IF NOT EXISTS idx_nominations_election_nominator
  ON nominations (election_id, nominator_license_hash);

CREATE INDEX IF NOT EXISTS idx_candidates_election_type_zone
  ON candidates (election_id, type, zone);

CREATE INDEX IF NOT EXISTS idx_candidates_election_member
  ON candidates (election_id, member_id);

CREATE INDEX IF NOT EXISTS idx_members_zone_name
  ON members (zone, full_name);
