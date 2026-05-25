import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

export type BallotCandidateOption = {
  id: string;
  fullName: string;
  zone: string | null;
};

export type BallotOptions = {
  electionId: string;
  phase: string;
  alreadyVoted: boolean;
  zonal: BallotCandidateOption[];
  national: BallotCandidateOption[];
};

type ApprovedCandidateRow = {
  id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  members: { full_name: string };
};

export async function hasVoterParticipated(
  env: Env,
  electionId: string,
  voterLicenseHash: string,
): Promise<boolean> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/voter_participation?` +
    `election_id=eq.${electionId}&voter_license_hash=eq.${encodeURIComponent(voterLicenseHash)}&select=id&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) return false;
  const rows = (await res.json()) as { id: string }[];
  return rows.length > 0;
}

export async function loadApprovedBallotCandidates(
  env: Env,
  electionId: string,
  voterZone: string,
): Promise<{ zonal: BallotCandidateOption[]; national: BallotCandidateOption[] }> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/candidates?` +
    `election_id=eq.${electionId}&status=eq.approved` +
    `&select=id,type,zone,members(full_name)` +
    `&order=members(full_name).asc`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Load ballot candidates failed:', res.status, await res.text());
    return { zonal: [], national: [] };
  }

  const rows = (await res.json()) as ApprovedCandidateRow[];
  const zonal: BallotCandidateOption[] = [];
  const national: BallotCandidateOption[] = [];

  for (const row of rows) {
    const option: BallotCandidateOption = {
      id: row.id,
      fullName: row.members?.full_name ?? 'Unknown',
      zone: row.zone,
    };
    if (row.type === 'zonal' && row.zone === voterZone) {
      zonal.push(option);
    } else if (row.type === 'national') {
      national.push(option);
    }
  }

  return { zonal, national };
}

export async function getBallotOptions(
  env: Env,
  electionId: string,
  phase: string,
  voterZone: string,
  voterLicenseHash: string,
): Promise<BallotOptions> {
  const [alreadyVoted, lists] = await Promise.all([
    hasVoterParticipated(env, electionId, voterLicenseHash),
    loadApprovedBallotCandidates(env, electionId, voterZone),
  ]);

  return {
    electionId,
    phase,
    alreadyVoted,
    zonal: lists.zonal,
    national: lists.national,
  };
}

export type SubmitBallotPayload = {
  electionId: string;
  zonalCandidateId: string;
  nationalCandidateIds: string[];
  voterLicenseHash: string;
  ipHash?: string;
};

async function insertBallot(
  env: Env,
  electionId: string,
  receiptToken: string,
): Promise<{ id: string } | { error: string }> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/ballots`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      election_id: electionId,
      receipt_token: receiptToken,
    }),
  });

  if (!res.ok) {
    console.error('Insert ballot failed:', res.status, await res.text());
    return { error: 'Could not record ballot' };
  }

  const rows = (await res.json()) as { id: string }[];
  const row = rows[0];
  if (!row?.id) return { error: 'Could not record ballot' };
  return { id: row.id };
}

async function insertBallotVotes(
  env: Env,
  ballotId: string,
  zonalCandidateId: string,
  nationalCandidateIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const votes = [
    { ballot_id: ballotId, candidate_id: zonalCandidateId, vote_type: 'zonal' },
    ...nationalCandidateIds.map((candidate_id) => ({
      ballot_id: ballotId,
      candidate_id,
      vote_type: 'national' as const,
    })),
  ];

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/ballot_votes`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(votes),
  });

  if (!res.ok) {
    console.error('Insert ballot votes failed:', res.status, await res.text());
    return { error: 'Could not record vote choices' };
  }
  return { ok: true };
}

async function insertVoterParticipation(
  env: Env,
  electionId: string,
  voterLicenseHash: string,
  ballotId: string,
  ipHash?: string,
): Promise<{ ok: true } | { error: string }> {
  const body: Record<string, string> = {
    election_id: electionId,
    voter_license_hash: voterLicenseHash,
    ballot_id: ballotId,
  };
  if (ipHash) body.ip_hash = ipHash;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/voter_participation`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Insert voter participation failed:', res.status, text);
    if (res.status === 409 || text.includes('duplicate')) {
      return { error: 'You have already voted in this election' };
    }
    return { error: 'Could not record participation' };
  }
  return { ok: true };
}

async function deleteBallot(env: Env, ballotId: string): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/ballot_votes?ballot_id=eq.${ballotId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env),
  });
  await fetch(`${env.SUPABASE_URL}/rest/v1/ballots?id=eq.${ballotId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env),
  });
}

export async function submitBallotPackage(
  env: Env,
  payload: SubmitBallotPayload,
): Promise<{ ok: true; receiptToken: string } | { error: string }> {
  const receiptToken = crypto.randomUUID();

  const ballot = await insertBallot(env, payload.electionId, receiptToken);
  if ('error' in ballot) return ballot;

  const votes = await insertBallotVotes(
    env,
    ballot.id,
    payload.zonalCandidateId,
    payload.nationalCandidateIds,
  );
  if ('error' in votes) {
    await deleteBallot(env, ballot.id);
    return votes;
  }

  const participation = await insertVoterParticipation(
    env,
    payload.electionId,
    payload.voterLicenseHash,
    ballot.id,
    payload.ipHash,
  );
  if ('error' in participation) {
    await deleteBallot(env, ballot.id);
    return participation;
  }

  return { ok: true, receiptToken };
}
