import type { ElectionPhase } from '@aia-pama/shared';
import { ELECTION_PHASES } from '@aia-pama/shared';
import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

export type ElectionRow = {
  id: string;
  cycle_year: number;
  phase: ElectionPhase;
  nomination_closes_at: string | null;
  voting_closes_at: string | null;
  certified_at: string | null;
};

const ELECTION_SELECT =
  'id,cycle_year,phase,nomination_closes_at,voting_closes_at,certified_at';

export async function getCurrentElection(env: Env): Promise<ElectionRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/elections?select=${ELECTION_SELECT}&order=created_at.desc&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Supabase elections lookup failed:', res.status, await res.text());
    return null;
  }

  const rows = (await res.json()) as ElectionRow[];
  const row = rows[0];
  if (!row) return null;

  const phase = ELECTION_PHASES.includes(row.phase) ? row.phase : 'draft';
  return { ...row, phase };
}

export async function certifyElectionRecord(
  env: Env,
  electionId: string,
): Promise<{ ok: true; certifiedAt: string } | { error: string }> {
  const certifiedAt = new Date().toISOString();
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/elections?id=eq.${electionId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      phase: 'certified',
      certified_at: certifiedAt,
      updated_at: certifiedAt,
    }),
  });

  if (!res.ok) {
    console.error('Certify election failed:', res.status, await res.text());
    return { error: 'Could not certify election' };
  }

  const rows = (await res.json()) as { certified_at: string }[];
  return { ok: true, certifiedAt: rows[0]?.certified_at ?? certifiedAt };
}
