import { Hono } from 'hono';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';
import { getCertifiedElectionResults } from '../lib/supabase-certified';
import { listQualifiedVoters } from '../lib/supabase-admin';

export const electionRoutes = new Hono<{ Bindings: Env }>();

electionRoutes.get('/current', async (c) => {
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }
  return c.json({ ok: true, election });
});

/** Official certified results announcement (published when phase is certified). */
electionRoutes.get('/certified-announcement', async (c) => {
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  if (election.phase !== 'certified') {
    return c.json({
      ok: false,
      error: 'Official results are published after ELECOM certifies the election',
      phase: election.phase,
    }, 403);
  }

  const certified = await getCertifiedElectionResults(c.env, election.id);
  const { stats } = await listQualifiedVoters(c.env, election.id);

  return c.json({
    ok: true,
    election: {
      id: election.id,
      cycle_year: election.cycle_year,
      phase: election.phase,
    },
    certifiedAt: election.certified_at ?? new Date().toISOString(),
    turnout: stats.voted,
    ...certified,
  });
});
