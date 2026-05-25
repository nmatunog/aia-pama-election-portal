-- Allow same member to run zonal and national in one election (separate candidacy rows)
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_election_id_member_id_key;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_election_member_type_key
  UNIQUE (election_id, member_id, type);

-- Recreate view (CREATE OR REPLACE cannot insert member_id column — must drop first)
DROP VIEW IF EXISTS public_results_v;

CREATE VIEW public_results_v AS
  SELECT
    c.election_id,
    c.id AS candidate_id,
    c.member_id,
    c.type,
    c.zone,
    m.full_name,
    COUNT(bv.id)::bigint AS vote_count
  FROM candidates c
  JOIN members m ON m.id = c.member_id
  LEFT JOIN ballot_votes bv ON bv.candidate_id = c.id
  WHERE c.status = 'approved'
  GROUP BY c.election_id, c.id, c.member_id, c.type, c.zone, m.full_name;

GRANT SELECT ON public_results_v TO anon, authenticated, service_role;
