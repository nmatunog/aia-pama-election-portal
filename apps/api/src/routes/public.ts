import { Hono } from 'hono';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';
import { loadPublicResults } from '../lib/supabase-public';
import { supabaseHeaders } from '../lib/supabase-headers';

export const publicRoutes = new Hono<{ Bindings: Env }>();

type PublicCandidateRow = {
  id: string;
  election_id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  full_name: string;
};

type TurnoutRow = {
  election_id: string;
  total_voted: number;
};

publicRoutes.get('/candidates', async (c) => {
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const showResults = ['canvassing', 'certified'].includes(election.phase);

  const [candidatesRes, turnoutRes, results] = await Promise.all([
    fetch(
      `${c.env.SUPABASE_URL}/rest/v1/public_candidates_v?election_id=eq.${election.id}&select=id,election_id,type,zone,full_name&order=full_name.asc`,
      { headers: supabaseHeaders(c.env) },
    ),
    fetch(
      `${c.env.SUPABASE_URL}/rest/v1/public_turnout_v?election_id=eq.${election.id}&select=election_id,total_voted`,
      { headers: supabaseHeaders(c.env) },
    ),
    showResults ? loadPublicResults(c.env, election.id) : Promise.resolve([]),
  ]);

  const candidates = candidatesRes.ok
    ? ((await candidatesRes.json()) as PublicCandidateRow[])
    : [];

  const turnoutRows = turnoutRes.ok ? ((await turnoutRes.json()) as TurnoutRow[]) : [];
  const turnout = turnoutRows[0]?.total_voted ?? 0;

  return c.json({
    ok: true,
    election: {
      id: election.id,
      cycle_year: election.cycle_year,
      phase: election.phase,
      nomination_closes_at: election.nomination_closes_at,
      voting_closes_at: election.voting_closes_at,
    },
    candidates,
    turnout,
    results,
    showResults,
  });
});
