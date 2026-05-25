import type { Env } from '../env';
import { findMemberByLicenseHash } from './supabase';
import { supabaseHeaders } from './supabase-headers';

export type CandidateInvitationRow = {
  id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  created_at: string;
  nominations: Array<{
    id: string;
    type: 'zonal' | 'national';
    created_at: string;
    nominator_license_hash: string;
  }>;
};

export type CandidateInvitation = {
  candidateId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  nominatedAt: string;
  nominationId: string;
  nominatorName: string;
};

export async function listPendingInvitations(
  env: Env,
  electionId: string,
  memberId: string,
): Promise<CandidateInvitation[]> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/candidates?` +
    `election_id=eq.${electionId}&member_id=eq.${memberId}&status=eq.pending_acceptance` +
    `&select=id,type,zone,status,created_at,nominations(id,type,created_at,nominator_license_hash)` +
    `&order=created_at.desc`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('List pending invitations failed:', res.status, await res.text());
    return [];
  }

  const rows = (await res.json()) as CandidateInvitationRow[];
  const invitations: CandidateInvitation[] = [];

  for (const row of rows) {
    const nomination = row.nominations?.[0];
    if (!nomination) continue;

    let nominatorName = 'AIA-PAMA member';
    const nominator = await findMemberByLicenseHash(env, nomination.nominator_license_hash);
    if (nominator) {
      nominatorName = nominator.full_name;
    }

    invitations.push({
      candidateId: row.id,
      type: row.type,
      zone: row.zone,
      status: row.status,
      nominatedAt: nomination.created_at,
      nominationId: nomination.id,
      nominatorName,
    });
  }

  return invitations;
}

export async function getCandidateForMember(
  env: Env,
  electionId: string,
  candidateId: string,
  memberId: string,
): Promise<{ id: string; status: string; member_id: string } | null> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/candidates?` +
    `id=eq.${candidateId}&election_id=eq.${electionId}&member_id=eq.${memberId}` +
    `&select=id,status,member_id&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Get candidate failed:', res.status, await res.text());
    return null;
  }

  const rows = (await res.json()) as { id: string; status: string; member_id: string }[];
  return rows[0] ?? null;
}

export async function updateCandidateStatus(
  env: Env,
  candidateId: string,
  memberId: string,
  status: 'pending_approval' | 'declined',
): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}&member_id=eq.${memberId}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ status }),
    },
  );

  if (!res.ok) {
    console.error('Update candidate status failed:', res.status, await res.text());
    return { error: 'Could not update nomination status' };
  }

  return { ok: true };
}
