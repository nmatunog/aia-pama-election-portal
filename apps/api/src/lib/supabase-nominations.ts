import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const ACTIVE_CANDIDATE_STATUSES = [
  'pending_acceptance',
  'pending_approval',
  'approved',
] as const;

export type NominationLimits = {
  electionId: string;
  phase: string;
  canSubmitZonal: boolean;
  canSubmitNational: boolean;
  nominatorZonalCount: number;
  nominatorNationalCount: number;
  zonalCandidatesInZone: number;
  nationalCandidatesCount: number;
  maxZonalPerZone: number;
  maxNational: number;
  maxNationalPerMember: number;
};

export type MyNominationRow = {
  id: string;
  type: 'zonal' | 'national';
  created_at: string;
  candidates: {
    id: string;
    status: string;
    members: { full_name: string; zone: string };
  };
};

async function countRows(env: Env, path: string): Promise<number> {
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    headers: {
      ...supabaseHeaders(env),
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok) {
    console.error('Supabase count failed:', path, res.status, await res.text());
    return 0;
  }
  const range = res.headers.get('content-range');
  if (!range) return 0;
  const total = range.split('/')[1];
  return total === '*' ? 0 : Number(total) || 0;
}

export async function getNominationLimits(
  env: Env,
  electionId: string,
  phase: string,
  nominatorLicenseHash: string,
  zone: string,
): Promise<Omit<NominationLimits, 'electionId' | 'phase'> & { electionId: string; phase: string }> {
  const statusFilter = ACTIVE_CANDIDATE_STATUSES.map((s) => `"${s}"`).join(',');

  const [nominatorZonalCount, nominatorNationalCount, zonalCandidatesInZone, nationalCandidatesCount] =
    await Promise.all([
      countRows(
        env,
        `/rest/v1/nominations?election_id=eq.${electionId}&nominator_license_hash=eq.${encodeURIComponent(nominatorLicenseHash)}&type=eq.zonal&select=id`,
      ),
      countRows(
        env,
        `/rest/v1/nominations?election_id=eq.${electionId}&nominator_license_hash=eq.${encodeURIComponent(nominatorLicenseHash)}&type=eq.national&select=id`,
      ),
      countRows(
        env,
        `/rest/v1/candidates?election_id=eq.${electionId}&type=eq.zonal&zone=eq.${encodeURIComponent(zone)}&status=in.(${statusFilter})&select=id`,
      ),
      countRows(
        env,
        `/rest/v1/candidates?election_id=eq.${electionId}&type=eq.national&status=in.(${statusFilter})&select=id`,
      ),
    ]);

  const canSubmitZonal =
    phase === 'nomination' && nominatorZonalCount < 1 && zonalCandidatesInZone < 3;
  const canSubmitNational =
    phase === 'nomination' && nominatorNationalCount < 5 && nationalCandidatesCount < 10;

  return {
    electionId,
    phase,
    canSubmitZonal,
    canSubmitNational,
    nominatorZonalCount,
    nominatorNationalCount,
    zonalCandidatesInZone,
    nationalCandidatesCount,
    maxZonalPerZone: 3,
    maxNational: 10,
    maxNationalPerMember: 5,
  };
}

export async function isCandidateAlreadyNominated(
  env: Env,
  electionId: string,
  memberId: string,
  type: 'zonal' | 'national',
): Promise<boolean> {
  const statusFilter = ACTIVE_CANDIDATE_STATUSES.map((s) => `"${s}"`).join(',');
  const count = await countRows(
    env,
    `/rest/v1/candidates?election_id=eq.${electionId}&member_id=eq.${memberId}&type=eq.${type}&status=in.(${statusFilter})&select=id`,
  );
  return count > 0;
}

export async function listMyNominations(
  env: Env,
  electionId: string,
  nominatorLicenseHash: string,
): Promise<MyNominationRow[]> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/nominations?` +
    `election_id=eq.${electionId}&nominator_license_hash=eq.${encodeURIComponent(nominatorLicenseHash)}` +
    `&select=id,type,created_at,candidates(id,status,members(full_name,zone))` +
    `&order=created_at.desc`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Supabase list nominations failed:', res.status, await res.text());
    return [];
  }
  return (await res.json()) as MyNominationRow[];
}

export type SubmitNominationResult = {
  candidateId: string;
  nominationId: string;
};

export async function submitNominationPackage(
  env: Env,
  input: {
    electionId: string;
    type: 'zonal' | 'national';
    zone: string | null;
    candidateMemberId: string;
    nominatorLicenseHash: string;
    endorserLicenseHashes: string[];
  },
): Promise<SubmitNominationResult | { error: string }> {
  const candidateBody = {
    election_id: input.electionId,
    member_id: input.candidateMemberId,
    type: input.type,
    zone: input.type === 'zonal' ? input.zone : null,
    status: 'pending_acceptance',
  };

  const candidateRes = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify(candidateBody),
  });

  if (!candidateRes.ok) {
    const text = await candidateRes.text();
    console.error('Insert candidate failed:', candidateRes.status, text);
    return { error: 'Could not create candidate record' };
  }

  const candidates = (await candidateRes.json()) as { id: string }[];
  const candidateId = candidates[0]?.id;
  if (!candidateId) return { error: 'Could not create candidate record' };

  const nominationRes = await fetch(`${env.SUPABASE_URL}/rest/v1/nominations`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      election_id: input.electionId,
      nominator_license_hash: input.nominatorLicenseHash,
      candidate_id: candidateId,
      type: input.type,
    }),
  });

  if (!nominationRes.ok) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}`, {
      method: 'DELETE',
      headers: supabaseHeaders(env),
    });
    console.error('Insert nomination failed:', nominationRes.status, await nominationRes.text());
    return { error: 'Could not create nomination record' };
  }

  const nominations = (await nominationRes.json()) as { id: string }[];
  const nominationId = nominations[0]?.id;
  if (!nominationId) return { error: 'Could not create nomination record' };

  const endorsementRows = input.endorserLicenseHashes.map((hash) => ({
    nomination_id: nominationId,
    endorser_license_hash: hash,
  }));

  const endorseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/endorsements`, {
    method: 'POST',
    headers: supabaseHeaders(env),
    body: JSON.stringify(endorsementRows),
  });

  if (!endorseRes.ok) {
    console.error('Insert endorsements failed:', endorseRes.status, await endorseRes.text());
    return { error: 'Could not save endorsers' };
  }

  return { candidateId, nominationId };
}

export async function appendAuditLog(
  env: Env,
  entry: {
    actorType: string;
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const prevRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/audit_log?select=row_hash&order=created_at.desc&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  let prevHash: string | null = null;
  if (prevRes.ok) {
    const rows = (await prevRes.json()) as { row_hash: string }[];
    prevHash = rows[0]?.row_hash ?? null;
  }

  const rowHash = await sha256Hex(
    JSON.stringify({ ...entry, prevHash, at: new Date().toISOString() }),
  );

  await fetch(`${env.SUPABASE_URL}/rest/v1/audit_log`, {
    method: 'POST',
    headers: supabaseHeaders(env),
    body: JSON.stringify({
      actor_type: entry.actorType,
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId,
      payload: entry.payload,
      prev_hash: prevHash,
      row_hash: rowHash,
    }),
  });
}
