import { findMemberByLicenseHash } from './supabase';
import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

export type PendingCandidateRow = {
  id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  members: { full_name: string; zone: string };
  nominations: Array<{
    id: string;
    created_at: string;
    nominator_license_hash: string;
  }>;
};

export type AdminCandidate = {
  candidateId: string;
  memberId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  rejectionReason: string | null;
  candidateName: string;
  candidateZone: string;
  nominatedAt: string;
  nominatorName: string;
  nominationId: string | null;
};

export type AdminNomination = {
  nominationId: string;
  type: 'zonal' | 'national';
  createdAt: string;
  nominatorName: string;
  candidateName: string;
  candidateZone: string;
  candidateStatus: string;
  endorserCount: number;
  candidateId: string;
};

export type AdminVoter = {
  memberId: string;
  fullName: string;
  zone: string;
  goodStanding: boolean;
  active: boolean;
  approvalStatus: string;
  contactEmail: string | null;
  hasVoted: boolean;
  votedAt: string | null;
};

export type ElectionOverview = {
  id: string;
  cycle_year: number;
  phase: string;
  nomination_opens_at: string | null;
  nomination_closes_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  certified_at: string | null;
};

export async function getElectionOverview(env: Env): Promise<ElectionOverview | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/elections?select=id,cycle_year,phase,nomination_opens_at,nomination_closes_at,voting_opens_at,voting_closes_at,certified_at&order=created_at.desc&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ElectionOverview[];
  return rows[0] ?? null;
}

async function countByStatus(env: Env, electionId: string, status: string): Promise<number> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/candidates?election_id=eq.${electionId}&status=eq.${status}&select=id`,
    {
      headers: {
        ...supabaseHeaders(env),
        Prefer: 'count=exact',
        Range: '0-0',
      },
    },
  );
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (!range) return 0;
  const total = range.split('/')[1];
  return total === '*' ? 0 : Number(total) || 0;
}

export async function getCandidateStatusCounts(
  env: Env,
  electionId: string,
): Promise<Record<string, number>> {
  const statuses = [
    'pending_acceptance',
    'pending_approval',
    'approved',
    'rejected',
    'declined',
  ] as const;
  const entries = await Promise.all(
    statuses.map(async (s) => [s, await countByStatus(env, electionId, s)] as const),
  );
  return Object.fromEntries(entries);
}

async function mapCandidateRow(
  env: Env,
  row: PendingCandidateRow,
): Promise<AdminCandidate> {
  const nom = row.nominations?.[0];
  let nominatorName = '—';
  if (nom?.nominator_license_hash) {
    const nominator = await findMemberByLicenseHash(env, nom.nominator_license_hash);
    if (nominator) nominatorName = nominator.full_name;
  }
  return {
    candidateId: row.id,
    memberId: '',
    type: row.type,
    zone: row.zone,
    status: row.status,
    rejectionReason: row.rejection_reason,
    candidateName: row.members?.full_name ?? 'Unknown',
    candidateZone: row.members?.zone ?? '',
    nominatedAt: nom?.created_at ?? row.created_at,
    nominatorName,
    nominationId: nom?.id ?? null,
  };
}

export async function listCandidates(
  env: Env,
  electionId: string,
  status?: string,
): Promise<AdminCandidate[]> {
  let url =
    `${env.SUPABASE_URL}/rest/v1/candidates?` +
    `election_id=eq.${electionId}` +
    `&select=id,member_id,type,zone,status,rejection_reason,created_at,members(full_name,zone),nominations(id,created_at,nominator_license_hash)` +
    `&order=created_at.desc`;

  if (status && status !== 'all') {
    url += `&status=eq.${status}`;
  }

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('List candidates failed:', res.status, await res.text());
    return [];
  }

  const rows = (await res.json()) as (PendingCandidateRow & { member_id: string })[];
  const mapped = await Promise.all(rows.map((r) => mapCandidateRow(env, r)));
  return mapped.map((c, i) => ({ ...c, memberId: rows[i]?.member_id ?? '' }));
}

export async function listPendingApprovalCandidates(
  env: Env,
  electionId: string,
): Promise<AdminCandidate[]> {
  return listCandidates(env, electionId, 'pending_approval');
}

export async function listNominations(env: Env, electionId: string): Promise<AdminNomination[]> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/nominations?` +
    `election_id=eq.${electionId}` +
    `&select=id,type,created_at,nominator_license_hash,candidate_id,` +
    `candidates(id,status,members(full_name,zone)),` +
    `endorsements(id)` +
    `&order=created_at.desc`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('List nominations failed:', res.status, await res.text());
    return [];
  }

  type Row = {
    id: string;
    type: 'zonal' | 'national';
    created_at: string;
    nominator_license_hash: string;
    candidate_id: string;
    candidates: {
      id: string;
      status: string;
      members: { full_name: string; zone: string };
    };
    endorsements: { id: string }[];
  };

  const rows = (await res.json()) as Row[];
  const out: AdminNomination[] = [];

  for (const row of rows) {
    let nominatorName = '—';
    const nominator = await findMemberByLicenseHash(env, row.nominator_license_hash);
    if (nominator) nominatorName = nominator.full_name;

    out.push({
      nominationId: row.id,
      type: row.type,
      createdAt: row.created_at,
      nominatorName,
      candidateName: row.candidates?.members?.full_name ?? 'Unknown',
      candidateZone: row.candidates?.members?.zone ?? '',
      candidateStatus: row.candidates?.status ?? '',
      endorserCount: row.endorsements?.length ?? 0,
      candidateId: row.candidate_id,
    });
  }

  return out;
}

export async function listQualifiedVoters(
  env: Env,
  electionId: string,
  zone?: string,
): Promise<{ voters: AdminVoter[]; stats: { total: number; eligible: number; voted: number } }> {
  let membersUrl =
    `${env.SUPABASE_URL}/rest/v1/members?` +
    `select=id,full_name,zone,good_standing,active,approval_status,contact_email,license_code_hash` +
    `&order=full_name.asc`;

  if (zone && zone !== 'all') {
    membersUrl += `&zone=eq.${encodeURIComponent(zone)}`;
  }

  const [membersRes, participationRes] = await Promise.all([
    fetch(membersUrl, { headers: supabaseHeaders(env) }),
    fetch(
      `${env.SUPABASE_URL}/rest/v1/voter_participation?election_id=eq.${electionId}&select=voter_license_hash,participated_at`,
      { headers: supabaseHeaders(env) },
    ),
  ]);

  if (!membersRes.ok) {
    return { voters: [], stats: { total: 0, eligible: 0, voted: 0 } };
  }

  const members = (await membersRes.json()) as Array<{
    id: string;
    full_name: string;
    zone: string;
    good_standing: boolean;
    active: boolean;
    approval_status: string;
    contact_email: string | null;
    license_code_hash: string;
  }>;

  const participation = participationRes.ok
    ? ((await participationRes.json()) as { voter_license_hash: string; participated_at: string }[])
    : [];

  const votedByHash = new Map(participation.map((p) => [p.voter_license_hash, p.participated_at]));

  const voters: AdminVoter[] = members.map((m) => {
    const votedAt = votedByHash.get(m.license_code_hash) ?? null;
    return {
      memberId: m.id,
      fullName: m.full_name,
      zone: m.zone,
      goodStanding: m.good_standing,
      active: m.active,
      approvalStatus: m.approval_status ?? 'approved',
      contactEmail: m.contact_email,
      hasVoted: votedAt !== null,
      votedAt,
    };
  });

  const eligible = voters.filter(
    (v) => v.approvalStatus === 'approved' && v.goodStanding && v.active,
  ).length;
  const voted = voters.filter((v) => v.hasVoted).length;

  return {
    voters,
    stats: { total: voters.length, eligible, voted },
  };
}

export async function updateElectionPhase(
  env: Env,
  electionId: string,
  phase: string,
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/elections?id=eq.${electionId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ phase, updated_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    console.error('Update election phase failed:', res.status, await res.text());
    return { error: 'Could not update election phase' };
  }
  return { ok: true };
}

export async function updateCandidateStatus(
  env: Env,
  electionId: string,
  candidateId: string,
  status: string,
  rejectionReason?: string,
): Promise<{ ok: true } | { error: string }> {
  const body: Record<string, string | null> = { status };
  if (status === 'rejected') {
    body.rejection_reason = rejectionReason ?? null;
  } else {
    body.rejection_reason = null;
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}&election_id=eq.${electionId}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    console.error('Update candidate status failed:', res.status, await res.text());
    return { error: 'Could not update candidate status' };
  }
  return { ok: true };
}

export async function updateMember(
  env: Env,
  memberId: string,
  patch: { goodStanding?: boolean; active?: boolean },
): Promise<{ ok: true } | { error: string }> {
  const body: Record<string, boolean> = {};
  if (patch.goodStanding !== undefined) body.good_standing = patch.goodStanding;
  if (patch.active !== undefined) body.active = patch.active;

  if (Object.keys(body).length === 0) {
    return { error: 'No fields to update' };
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('Update member failed:', res.status, await res.text());
    return { error: 'Could not update member' };
  }
  return { ok: true };
}

export async function reviewCandidate(
  env: Env,
  candidateId: string,
  electionId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string,
): Promise<{ ok: true } | { error: string }> {
  return updateCandidateStatus(
    env,
    electionId,
    candidateId,
    decision,
    rejectionReason,
  );
}
