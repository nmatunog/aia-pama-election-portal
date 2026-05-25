import {
  ELECTION_PHASES,
  type ElectionPhase,
} from '@aia-pama/shared';
import { fetchActiveElection } from './supabase/server';

/** Current election phase — Supabase first, then env fallback */
export async function getCurrentElectionPhase(): Promise<ElectionPhase> {
  try {
    const election = await fetchActiveElection();
    if (election) return election.phase;
  } catch {
    /* build / network — use env or default */
  }

  const fromEnv = process.env.NEXT_PUBLIC_ELECTION_PHASE;
  if (fromEnv && ELECTION_PHASES.includes(fromEnv as ElectionPhase)) {
    return fromEnv as ElectionPhase;
  }
  return 'nomination';
}
