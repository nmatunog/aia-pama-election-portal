import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';
import type { MemberRow } from './supabase';

export type MemberPublic = {
  id: string;
  full_name: string;
  zone: string;
};

export type MemberWithHash = MemberRow & {
  license_code_hash: string;
};

export async function findMemberById(
  env: Env,
  memberId: string,
): Promise<MemberWithHash | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/members?id=eq.${memberId}&select=id,full_name,zone,good_standing,active,license_code_hash&limit=1`;

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
  const url = `${env.SUPABASE_URL}/rest/v1/members?id=in.(${inList})&select=id,full_name,zone,good_standing,active,license_code_hash`;

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
