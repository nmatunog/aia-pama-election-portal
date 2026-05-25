import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

export type PublicResultRow = {
  election_id: string;
  candidate_id: string;
  member_id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  full_name: string;
  vote_count: number;
};

type BallotVoteRow = {
  candidate_id: string;
  candidates: {
    election_id: string;
    member_id: string;
    type: 'zonal' | 'national';
    zone: string | null;
    status: string;
    members: { full_name: string };
  };
};

/** Load vote totals from public_results_v, or aggregate ballot_votes if view grants are missing. */
export async function loadPublicResults(
  env: Env,
  electionId: string,
): Promise<PublicResultRow[]> {
  const viewUrl =
    `${env.SUPABASE_URL}/rest/v1/public_results_v?` +
    `election_id=eq.${electionId}` +
    `&select=election_id,candidate_id,member_id,type,zone,full_name,vote_count` +
    `&order=vote_count.desc`;

  const viewRes = await fetch(viewUrl, { headers: supabaseHeaders(env) });
  if (viewRes.ok) {
    const rows = (await viewRes.json()) as PublicResultRow[];
    return rows.map((r) => ({
      ...r,
      vote_count: Number(r.vote_count) || 0,
    }));
  }

  const errText = await viewRes.text();
  console.warn('public_results_v failed, using ballot_votes fallback:', viewRes.status, errText);

  const votesUrl =
    `${env.SUPABASE_URL}/rest/v1/ballot_votes?` +
    `select=candidate_id,candidates!inner(election_id,member_id,type,zone,status,members(full_name))` +
    `&candidates.election_id=eq.${electionId}` +
    `&candidates.status=eq.approved`;

  const votesRes = await fetch(votesUrl, { headers: supabaseHeaders(env) });
  if (!votesRes.ok) {
    console.error('Ballot votes fallback failed:', votesRes.status, await votesRes.text());
    return [];
  }

  const votes = (await votesRes.json()) as BallotVoteRow[];
  const byCandidate = new Map<string, PublicResultRow>();

  for (const row of votes) {
    const c = row.candidates;
    if (!c || c.status !== 'approved') continue;

    const existing = byCandidate.get(row.candidate_id);
    if (existing) {
      existing.vote_count += 1;
      continue;
    }

    byCandidate.set(row.candidate_id, {
      election_id: c.election_id,
      candidate_id: row.candidate_id,
      member_id: c.member_id,
      type: c.type,
      zone: c.zone,
      full_name: c.members?.full_name ?? 'Unknown',
      vote_count: 1,
    });
  }

  const approvedUrl =
    `${env.SUPABASE_URL}/rest/v1/candidates?` +
    `election_id=eq.${electionId}&status=eq.approved` +
    `&select=id,type,zone,members(full_name)`;

  const approvedRes = await fetch(approvedUrl, { headers: supabaseHeaders(env) });
  if (approvedRes.ok) {
    const approved = (await approvedRes.json()) as Array<{
      id: string;
      member_id: string;
      type: 'zonal' | 'national';
      zone: string | null;
      members: { full_name: string };
    }>;

    for (const c of approved) {
      if (!byCandidate.has(c.id)) {
        byCandidate.set(c.id, {
          election_id: electionId,
          candidate_id: c.id,
          member_id: c.member_id,
          type: c.type,
          zone: c.zone,
          full_name: c.members?.full_name ?? 'Unknown',
          vote_count: 0,
        });
      }
    }
  }

  return [...byCandidate.values()].sort((a, b) => b.vote_count - a.vote_count);
}
