-- RLS policies: anon read-only on public views; service role writes via Worker only

-- Public read: elections metadata (non-sensitive)
CREATE POLICY elections_public_read ON elections
  FOR SELECT TO anon, authenticated
  USING (phase IN ('nomination', 'voting', 'canvassing', 'certified'));

-- Public read: approved candidates only
CREATE POLICY candidates_public_read ON candidates
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Deny all direct writes from anon/authenticated on sensitive tables
CREATE POLICY nominations_no_client_write ON nominations
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY ballots_no_client_write ON ballots
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY ballot_votes_no_client_write ON ballot_votes
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY voter_participation_no_client_read ON voter_participation
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY audit_log_admin_only ON audit_log
  FOR ALL TO anon, authenticated
  USING (false);

-- Public views (no voter identity exposure)
CREATE OR REPLACE VIEW public_candidates_v AS
  SELECT
    c.id,
    c.election_id,
    c.type,
    c.zone,
    m.full_name,
    c.status
  FROM candidates c
  JOIN members m ON m.id = c.member_id
  WHERE c.status = 'approved';

CREATE OR REPLACE VIEW public_turnout_v AS
  SELECT
    election_id,
    COUNT(*) AS total_voted
  FROM voter_participation
  GROUP BY election_id;

-- Grant read on public views
GRANT SELECT ON public_candidates_v TO anon, authenticated;
GRANT SELECT ON public_turnout_v TO anon, authenticated;
