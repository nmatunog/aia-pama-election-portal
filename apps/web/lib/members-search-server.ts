import { ensureServerEnv } from './env';

export type MemberPublic = {
  id: string;
  full_name: string;
  zone: string;
};

/** Server-only roster search (after session check). Uses service role; never expose to client. */
export async function searchMembersServer(options: {
  zone?: string;
  query: string;
  limit?: number;
}): Promise<MemberPublic[]> {
  ensureServerEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — add to apps/web/.env.local',
    );
    throw new Error('Server misconfigured for member search');
  }

  const limit = Math.min(options.limit ?? 25, 50);
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

  const res = await fetch(`${url}/rest/v1/members?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    console.error('Member search failed:', res.status, await res.text());
    return [];
  }

  return (await res.json()) as MemberPublic[];
}
