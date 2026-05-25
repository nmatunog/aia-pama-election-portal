-- AIA-PAMA Election Portal — Initial Schema (Phase 0)
-- Vote secrecy: voter_participation separated from ballot_votes

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE election_phase AS ENUM (
  'draft', 'nomination', 'voting', 'canvassing', 'certified', 'failed'
);

CREATE TYPE zone_name AS ENUM (
  'North Central Luzon',
  'South Central Luzon',
  'Manila 1',
  'Manila 2',
  'Visayas',
  'Mindanao'
);

CREATE TYPE candidate_type AS ENUM ('zonal', 'national');
CREATE TYPE candidate_status AS ENUM (
  'pending_acceptance', 'declined', 'pending_approval', 'approved', 'rejected'
);

-- Elections
CREATE TABLE elections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_year    INT NOT NULL,
  phase         election_phase NOT NULL DEFAULT 'draft',
  nomination_opens_at  TIMESTAMPTZ,
  nomination_closes_at TIMESTAMPTZ,
  voting_opens_at      TIMESTAMPTZ,
  voting_closes_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Member roster (license codes stored as SHA-256 hash only)
CREATE TABLE members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code_hash   TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  zone                zone_name NOT NULL,
  email_hash          TEXT,
  mobile_hash         TEXT,
  good_standing       BOOLEAN NOT NULL DEFAULT true,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidates
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id),
  member_id     UUID NOT NULL REFERENCES members(id),
  type          candidate_type NOT NULL,
  zone          zone_name,
  status        candidate_status NOT NULL DEFAULT 'pending_acceptance',
  rejection_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, member_id)
);

-- Nominations (insert-only)
CREATE TABLE nominations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id             UUID NOT NULL REFERENCES elections(id),
  nominator_license_hash  TEXT NOT NULL,
  candidate_id            UUID NOT NULL REFERENCES candidates(id),
  type                    candidate_type NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Endorsements (insert-only)
CREATE TABLE endorsements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id           UUID NOT NULL REFERENCES nominations(id),
  endorser_license_hash   TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ballots — anonymous container, NO voter identity column
CREATE TABLE ballots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id),
  receipt_token TEXT NOT NULL UNIQUE,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ballot votes — choices only, linked to ballot_id
CREATE TABLE ballot_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id     UUID NOT NULL REFERENCES ballots(id),
  candidate_id  UUID NOT NULL REFERENCES candidates(id),
  vote_type     candidate_type NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ballot_id, candidate_id)
);

-- Voter participation — who voted (turnout), separate from choices
CREATE TABLE voter_participation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id           UUID NOT NULL REFERENCES elections(id),
  voter_license_hash    TEXT NOT NULL,
  ballot_id             UUID NOT NULL REFERENCES ballots(id),
  ip_hash               TEXT,
  device_hash           TEXT,
  participated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, voter_license_hash)
);

-- Hash-chained audit log (insert-only)
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type    TEXT NOT NULL,
  actor_id      TEXT,
  action        TEXT NOT NULL,
  entity        TEXT NOT NULL,
  entity_id     TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  prev_hash     TEXT,
  row_hash      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protests
CREATE TABLE protests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id           UUID NOT NULL REFERENCES elections(id),
  filer_license_hash    TEXT NOT NULL,
  description           TEXT NOT NULL,
  evidence_path         TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_ballot_votes_ballot ON ballot_votes(ballot_id);
CREATE INDEX idx_voter_participation_election ON voter_participation(election_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- Immutability: revoke UPDATE/DELETE on sensitive tables
REVOKE UPDATE, DELETE ON nominations FROM PUBLIC;
REVOKE UPDATE, DELETE ON endorsements FROM PUBLIC;
REVOKE UPDATE, DELETE ON ballots FROM PUBLIC;
REVOKE UPDATE, DELETE ON ballot_votes FROM PUBLIC;
REVOKE UPDATE, DELETE ON voter_participation FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- Trigger: enforce max 5 national votes per ballot
CREATE OR REPLACE FUNCTION check_national_vote_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote_type = 'national' THEN
    IF (
      SELECT COUNT(*) FROM ballot_votes
      WHERE ballot_id = NEW.ballot_id AND vote_type = 'national'
    ) >= 5 THEN
      RAISE EXCEPTION 'Maximum 5 national votes per ballot';
    END IF;
  END IF;
  IF NEW.vote_type = 'zonal' THEN
    IF (
      SELECT COUNT(*) FROM ballot_votes
      WHERE ballot_id = NEW.ballot_id AND vote_type = 'zonal'
    ) >= 1 THEN
      RAISE EXCEPTION 'Maximum 1 zonal vote per ballot';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ballot_vote_limits
  BEFORE INSERT ON ballot_votes
  FOR EACH ROW EXECUTE FUNCTION check_national_vote_limit();

-- Trigger: enforce exactly 1 zonal vote exists after ballot complete (app-layer also validates)

-- RLS enabled; policies added in 002_rls_policies.sql
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE protests ENABLE ROW LEVEL SECURITY;
