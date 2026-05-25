-- Grant API access for Worker (service_role) and public read policies
-- Required when "Automatically expose new tables" is disabled in Supabase

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT ON public.elections TO anon, authenticated, service_role;
GRANT SELECT ON public.candidates TO anon, authenticated, service_role;
GRANT SELECT ON public.members TO service_role;

GRANT ALL ON public.elections TO service_role;
GRANT ALL ON public.members TO service_role;
GRANT ALL ON public.candidates TO service_role;
GRANT ALL ON public.nominations TO service_role;
GRANT ALL ON public.endorsements TO service_role;
GRANT ALL ON public.ballots TO service_role;
GRANT ALL ON public.ballot_votes TO service_role;
GRANT ALL ON public.voter_participation TO service_role;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON public.protests TO service_role;

GRANT SELECT ON public.public_candidates_v TO anon, authenticated, service_role;
GRANT SELECT ON public.public_turnout_v TO anon, authenticated, service_role;
