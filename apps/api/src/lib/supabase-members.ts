import { hashLicenseCode } from '@aia-pama/shared';
import type { Env } from '../env';
import { parseSuperuserLicenses } from './elecom-auth-config';
import type { MemberRow } from './supabase';
import { supabaseHeaders } from './supabase-headers';

export type MemberPublic = {
  id: string;
  full_name: string;
  zone: string;
};

export type MemberWithHash = MemberRow & {
  license_code_hash: string;
  approval_status?: string;
};

export type MemberRecord = {
  id: string;
  full_name: string;
  zone: string;
  good_standing: boolean;
  active: boolean;
  approval_status: 'pending_approval' | 'approved' | 'rejected';
  contact_email: string | null;
  registered_at: string;
  rejection_reason: string | null;
};

const MEMBER_SELECT =
  'id,full_name,zone,good_standing,active,approval_status,contact_email,registered_at,rejection_reason,license_code_hash';

export async function findMemberById(
  env: Env,
  memberId: string,
): Promise<MemberWithHash | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/members?id=eq.${memberId}&select=id,full_name,zone,good_standing,active,approval_status,license_code_hash&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Supabase member by id failed:', res.status, await res.text());
    return null;
  }
  const rows = (await res.json()) as MemberWithHash[];
  return rows[0] ?? null;
}

export async function findMembersByIds(
  env: Env,
  memberIds: string[],
): Promise<MemberWithHash[]> {
  if (memberIds.length === 0) return [];

  const inList = memberIds.map((id) => encodeURIComponent(id)).join(',');
  const url = `${env.SUPABASE_URL}/rest/v1/members?id=in.(${inList})&select=id,full_name,zone,good_standing,active,approval_status,license_code_hash`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Supabase members by ids failed:', res.status, await res.text());
    return [];
  }
  return (await res.json()) as MemberWithHash[];
}

export async function searchMembers(
  env: Env,
  options: { zone?: string; query: string; limit?: number },
): Promise<MemberPublic[]> {
  const limit = Math.min(options.limit ?? 20, 50);
  const params = new URLSearchParams({
    select: 'id,full_name,zone',
    active: 'eq.true',
    good_standing: 'eq.true',
    approval_status: 'eq.approved',
    order: 'full_name.asc',
    limit: String(limit),
  });

  if (options.zone) {
    params.set('zone', `eq.${options.zone}`);
  }

  const q = options.query.trim();
  if (q.length >= 2) {
    const escaped = q.replace(/[%_*]/g, '');
    params.set('full_name', `ilike.*${escaped}*`);
  }

  const url = `${env.SUPABASE_URL}/rest/v1/members?${params.toString()}`;
  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) {
    console.error('Supabase member search failed:', res.status, await res.text());
    return [];
  }
  return (await res.json()) as MemberPublic[];
}

export async function listMembers(
  env: Env,
  filters?: { approvalStatus?: string; active?: boolean },
): Promise<MemberRecord[]> {
  let url = `${env.SUPABASE_URL}/rest/v1/members?select=${MEMBER_SELECT}&order=registered_at.desc`;
  if (filters?.approvalStatus) {
    url += `&approval_status=eq.${filters.approvalStatus}`;
  }
  if (filters?.active !== undefined) {
    url += `&active=eq.${filters.active}`;
  }
  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) return [];
  return (await res.json()) as MemberRecord[];
}

export async function isSuperuserMember(
  env: Env,
  licenseHash: string,
): Promise<boolean> {
  const licenses = parseSuperuserLicenses(env);
  for (const code of licenses) {
    const hash = await hashLicenseCode(code);
    if (hash === licenseHash) return true;
  }
  return false;
}

export async function createMemberSignup(
  env: Env,
  input: {
    licenseCode: string;
    fullName: string;
    zone: string;
    contactEmail: string;
  },
): Promise<{ ok: true; memberId: string } | { error: string }> {
  const licenseHash = await hashLicenseCode(input.licenseCode);

  const existing = await fetch(
    `${env.SUPABASE_URL}/rest/v1/members?license_code_hash=eq.${licenseHash}&select=id,approval_status&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  if (existing.ok) {
    const rows = (await existing.json()) as { id: string; approval_status: string }[];
    const row = rows[0];
    if (row) {
      if (row.approval_status === 'pending_approval') {
        return { error: 'A signup with this license code is already pending ELECOM review.' };
      }
      if (row.approval_status === 'approved') {
        return { error: 'This license code is already registered. Use Member Login instead.' };
      }
      if (row.approval_status === 'rejected') {
        const patch = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
          body: JSON.stringify({
            full_name: input.fullName,
            zone: input.zone,
            contact_email: input.contactEmail,
            approval_status: 'pending_approval',
            active: false,
            good_standing: false,
            rejection_reason: null,
            registered_at: new Date().toISOString(),
          }),
        });
        if (!patch.ok) return { error: 'Could not resubmit application' };
        return { ok: true, memberId: row.id };
      }
    }
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members`, {
    method: 'POST',
    headers: supabaseHeaders(env, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      license_code_hash: licenseHash,
      full_name: input.fullName,
      zone: input.zone,
      contact_email: input.contactEmail,
      approval_status: 'pending_approval',
      good_standing: false,
      active: false,
      registered_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes('duplicate') || text.includes('unique')) {
      return { error: 'License code already registered' };
    }
    return { error: 'Could not submit signup' };
  }
  const rows = (await res.json()) as { id: string }[];
  return { ok: true, memberId: rows[0]!.id };
}

export async function reviewMemberSignup(
  env: Env,
  memberId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string,
): Promise<{ ok: true } | { error: string }> {
  const member = await listMembers(env);
  const row = member.find((m) => m.id === memberId);
  if (!row) return { error: 'Member not found' };
  if (row.approval_status !== 'pending_approval') {
    return { error: 'Member is not pending approval' };
  }

  const body =
    decision === 'approved'
      ? {
          approval_status: 'approved',
          active: true,
          good_standing: true,
          rejection_reason: null,
        }
      : {
          approval_status: 'rejected',
          active: false,
          good_standing: false,
          rejection_reason: rejectionReason ?? 'Not approved by ELECOM',
        };

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) return { error: 'Could not update member' };
  return { ok: true };
}

export async function deleteMemberRecord(
  env: Env,
  memberId: string,
): Promise<{ ok: true } | { error: string }> {
  const m = await findMemberById(env, memberId);
  if (!m) return { error: 'Member not found' };

  if (await isSuperuserMember(env, m.license_code_hash)) {
    return { error: 'Cannot delete ELECOM superuser account' };
  }

  const cand = await fetch(
    `${env.SUPABASE_URL}/rest/v1/candidates?member_id=eq.${memberId}&select=id&limit=1`,
    { headers: supabaseHeaders(env) },
  );
  if (cand.ok) {
    const rows = (await cand.json()) as { id: string }[];
    if (rows.length > 0) {
      return {
        error: 'Member has election candidacy history. Deactivate (inactive) instead of delete.',
      };
    }
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
  });
  if (!res.ok) return { error: 'Could not delete member' };
  return { ok: true };
}

export async function importMemberRoster(
  env: Env,
  rows: Array<{
    licenseCode: string;
    fullName: string;
    zone: string;
    goodStanding?: boolean;
    active?: boolean;
  }>,
  options?: { deactivateOthers?: boolean },
): Promise<{ ok: true; upserted: number; deactivated: number } | { error: string }> {
  const superHashes = new Set<string>();
  for (const code of parseSuperuserLicenses(env)) {
    superHashes.add(await hashLicenseCode(code));
  }

  let deactivated = 0;
  if (options?.deactivateOthers) {
    const all = await fetch(
      `${env.SUPABASE_URL}/rest/v1/members?select=id,license_code_hash`,
      { headers: supabaseHeaders(env) },
    );
    if (all.ok) {
      const members = (await all.json()) as { id: string; license_code_hash: string }[];
      const importHashes = new Set(
        await Promise.all(rows.map((r) => hashLicenseCode(r.licenseCode))),
      );
      for (const mem of members) {
        if (superHashes.has(mem.license_code_hash)) continue;
        if (importHashes.has(mem.license_code_hash)) continue;
        await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${mem.id}`, {
          method: 'PATCH',
          headers: supabaseHeaders(env, { Prefer: 'return=minimal' }),
          body: JSON.stringify({ active: false, good_standing: false }),
        });
        deactivated++;
      }
    }
  }

  const payload = await Promise.all(
    rows.map(async (r) => ({
      license_code_hash: await hashLicenseCode(r.licenseCode),
      full_name: r.fullName,
      zone: r.zone,
      good_standing: r.goodStanding ?? true,
      active: r.active ?? true,
      approval_status: 'approved',
      rejection_reason: null,
    })),
  );

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members?on_conflict=license_code_hash`, {
    method: 'POST',
    headers: supabaseHeaders(env, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return { error: `Roster import failed: ${await res.text()}` };
  }

  return { ok: true, upserted: payload.length, deactivated };
}
