import type { Env } from '../env';
import { supabaseHeaders } from './supabase-headers';

const OTP_TTL_MS = 10 * 60 * 1000;

export async function saveOtpSession(
  env: Env,
  input: {
    sessionId: string;
    licenseHash: string;
    memberId: string;
    contact: string;
    memberName: string;
    otp: string;
  },
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/otp_sessions`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env),
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: input.sessionId,
      license_hash: input.licenseHash,
      member_id: input.memberId,
      otp: input.otp,
      contact: input.contact,
      member_name: input.memberName,
      expires_at: expiresAt,
    }),
  });

  if (!res.ok) {
    console.error('otp_sessions insert failed:', res.status, await res.text());
    return false;
  }
  return true;
}

export async function verifyOtpSessionDb(
  env: Env,
  sessionId: string,
  licenseHash: string,
  otp: string,
): Promise<{ ok: true; memberId: string } | { ok: false }> {
  const url = `${env.SUPABASE_URL}/rest/v1/otp_sessions?id=eq.${sessionId}&select=license_hash,member_id,otp,expires_at&limit=1`;
  const res = await fetch(url, { headers: supabaseHeaders(env) });

  if (!res.ok) {
    console.error('otp_sessions lookup failed:', res.status, await res.text());
    return { ok: false };
  }

  const rows = (await res.json()) as {
    license_hash: string;
    member_id: string;
    otp: string;
    expires_at: string;
  }[];

  const row = rows[0];
  if (!row) return { ok: false };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteOtpSession(env, sessionId);
    return { ok: false };
  }

  if (row.license_hash !== licenseHash || row.otp !== otp) {
    return { ok: false };
  }

  await deleteOtpSession(env, sessionId);
  return { ok: true, memberId: row.member_id };
}

async function deleteOtpSession(env: Env, sessionId: string): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/otp_sessions?id=eq.${sessionId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env),
  });
}
