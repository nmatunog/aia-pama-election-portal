import { createClient } from '@supabase/supabase-js';
import type { ElectionPhase } from '@aia-pama/shared';
import { ELECTION_PHASES } from '@aia-pama/shared';

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type ActiveElection = {
  id: string;
  cycle_year: number;
  phase: ElectionPhase;
  nomination_closes_at: string | null;
  voting_closes_at: string | null;
};

/** Fetch current election phase from Supabase (falls back to env/default) */
export async function fetchActiveElection(): Promise<ActiveElection | null> {
  try {
    const supabase = createServerSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('elections')
      .select('id, cycle_year, phase, nomination_closes_at, voting_closes_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const phase = ELECTION_PHASES.includes(data.phase as ElectionPhase)
      ? (data.phase as ElectionPhase)
      : 'draft';

    return { ...data, phase };
  } catch {
    return null;
  }
}
