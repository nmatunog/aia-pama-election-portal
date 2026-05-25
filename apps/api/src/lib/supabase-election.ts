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
};

export async function getCurrentElection(env: Env): Promise<ElectionRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/elections?select=id,cycle_year,phase,nomination_closes_at,voting_closes_at&order=created_at.desc&limit=1`;

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
