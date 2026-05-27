import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

const LOGIN_SECRET_KEY = 'member_login_secret';

/** Read member login secret: DB value takes precedence over env var. */
export async function getMemberLoginSecret(env: Env): Promise<string | null> {
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/app_config?key=eq.${LOGIN_SECRET_KEY}&select=value&limit=1`;
    const res = await fetch(url, { headers: supabaseHeaders(env) });
    if (res.ok) {
      const rows = (await res.json()) as { value: string }[];
      if (rows[0]?.value) return rows[0].value;
    }
  } catch {
    /* fall through to env fallback */
  }
  return env.MEMBER_LOGIN_SECRET ?? null;
}

/** Upsert the member login secret in app_config. */
export async function setMemberLoginSecret(env: Env, secret: string): Promise<{ ok: boolean; error?: string }> {
  const url = `${env.SUPABASE_URL}/rest/v1/app_config`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key: LOGIN_SECRET_KEY, value: secret, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `DB error: ${res.status} ${text}` };
  }
  return { ok: true };
}
