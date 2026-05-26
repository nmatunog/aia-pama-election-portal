import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

export type MemberRow = {
  id: string;
  full_name: string;
  zone: string;
  good_standing: boolean;
  active: boolean;
  approval_status?: string;
};

export async function findMemberByLicenseHash(
  env: Env,
  licenseHash: string,
): Promise<MemberRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/members?license_code_hash=eq.${licenseHash}&select=id,full_name,zone,good_standing,active&limit=1`;

  const res = await fetch(url, { headers: supabaseHeaders(env) });

  if (!res.ok) {
    console.error('Supabase members lookup failed:', res.status, await res.text());
    return null;
  }
  const rows = (await res.json()) as MemberRow[];
  return rows[0] ?? null;
}
