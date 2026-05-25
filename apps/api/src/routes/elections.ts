import { Hono } from 'hono';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';

export const electionRoutes = new Hono<{ Bindings: Env }>();

electionRoutes.get('/current', async (c) => {
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }
  return c.json({ ok: true, election });
});
