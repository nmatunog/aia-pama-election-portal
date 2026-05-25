-- Public results: vote counts per approved candidate (no voter identity)

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
