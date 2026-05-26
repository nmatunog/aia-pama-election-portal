import type { Env } from '../env';
import { getElectionOverview } from './supabase-admin';
import { supabaseHeaders } from './supabase-headers';

async function clearElectionData(env: Env, electionId: string): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/voter_participation?election_id=eq.${electionId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
  });

  const ballots = await fetch(
    `${env.SUPABASE_URL}/rest/v1/ballots?election_id=eq.${electionId}&select=id`,
    { headers: supabaseHeaders(env) },
  );
  const ids = ballots.ok ? ((await ballots.json()) as { id: string }[]).map((b) => b.id) : [];
  if (ids.length > 0) {
    const inList = ids.join(',');
    await fetch(`${env.SUPABASE_URL}/rest/v1/ballot_votes?ballot_id=in.(${inList})`, {
      method: 'DELETE',
      headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    });
    await fetch(`${env.SUPABASE_URL}/rest/v1/ballots?id=in.(${inList})`, {
      method: 'DELETE',
      headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    });
  }

  const noms = await fetch(
    `${env.SUPABASE_URL}/rest/v1/nominations?election_id=eq.${electionId}&select=id`,
    { headers: supabaseHeaders(env) },
  );
  const nomIds = noms.ok ? ((await noms.json()) as { id: string }[]).map((n) => n.id) : [];
  if (nomIds.length > 0) {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/endorsements?nomination_id=in.(${nomIds.join(',')})`,
      { method: 'DELETE', headers: supabaseHeaders(env, { Prefer: 'return=minimal' }) },
    );
  }
  await fetch(`${env.SUPABASE_URL}/rest/v1/nominations?election_id=eq.${electionId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
  });
  await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?election_id=eq.${electionId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
  });
}

export async function startNewElectionCycle(
  env: Env,
  options: { cycleYear?: number; force?: boolean },
): Promise<
  | { ok: true; electionId: string; cycleYear: number; archivedElectionId?: string }
  | { error: string }
> {
  const current = await getElectionOverview(env);
  const closable = ['certified', 'failed'];
  if (current && !closable.includes(current.phase) && !options.force) {
    return {
      error:
        'Current election must be certified or failed before starting a new cycle (or use force).',
    };
  }

  let archivedElectionId: string | undefined;
  if (current) {
    archivedElectionId = current.id;
    await fetch(`${env.SUPABASE_URL}/rest/v1/elections?id=eq.${current.id}`, {
      method: 'PATCH',
      headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        phase: 'failed',
        updated_at: new Date().toISOString(),
      }),
    });
  }

  const cycleYear = options.cycleYear ?? new Date().getFullYear();
  const closes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/elections`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      cycle_year: cycleYear,
      phase: 'nomination',
      nomination_opens_at: new Date().toISOString(),
      nomination_closes_at: closes,
      voting_opens_at: null,
      voting_closes_at: null,
      certified_at: null,
    }),
  });

  if (!res.ok) {
    return { error: `Could not create election: ${await res.text()}` };
  }

  const rows = (await res.json()) as { id: string; cycle_year: number }[];
  return {
    ok: true,
    electionId: rows[0]!.id,
    cycleYear: rows[0]!.cycle_year,
    archivedElectionId,
  };
}

/** Wipe current election data but keep the same election row (nomination reset). */
export async function resetCurrentElection(
  env: Env,
): Promise<{ ok: true } | { error: string }> {
  const current = await getElectionOverview(env);
  if (!current) return { error: 'No election configured' };

  await clearElectionData(env, current.id);

  const closes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/elections?id=eq.${current.id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify({
      phase: 'nomination',
      certified_at: null,
      voting_opens_at: null,
      voting_closes_at: null,
      nomination_opens_at: new Date().toISOString(),
      nomination_closes_at: closes,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) return { error: 'Could not reset election' };
  return { ok: true };
}
