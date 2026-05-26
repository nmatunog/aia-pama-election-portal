import type { Env } from '../env';
import type { ElecomClaims } from './jwt';
import { verifyElecomToken, verifyVoterToken } from './jwt';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function parseAdminEmails(env: Env): string[] {
  const raw = env.ELECOM_ADMIN_EMAILS ?? env.ELECOM_ADMIN_EMAIL ?? 'elecom@aiapama.test';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function parseSuperuserLicenses(env: Env): string[] {
  const raw = env.ELECOM_SUPERUSER_LICENSES ?? '007264013';
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

export async function isSuperuserLicense(env: Env, licenseCode: string): Promise<boolean> {
  const normalized = licenseCode.trim();
  return parseSuperuserLicenses(env).includes(normalized);
}

/** ELECOM via roster flag and/or env-configured superuser license. */
export function memberHasElecomPrivileges(
  env: Env,
  member: { is_elecom?: boolean },
  licenseCode?: string,
): boolean {
  if (member.is_elecom === true) return true;
  if (licenseCode && parseSuperuserLicenses(env).includes(licenseCode.trim())) {
    return true;
  }
  return false;
}

export function superuserEmail(env: Env): string {
  return parseAdminEmails(env)[0] ?? 'nmatunog@gmail.com';
}

/** Dev/staging ELECOM credentials from Worker env (use Supabase Auth in production). */
export function verifyElecomCredentials(
  env: Env,
  email: string,
  password: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const allowedEmails = parseAdminEmails(env);
  const allowedPassword = env.ELECOM_ADMIN_PASSWORD ?? '';

  if (!allowedPassword) {
    return {
      ok: false,
      error:
        'ELECOM admin login is not configured. Set ELECOM_ADMIN_PASSWORD in apps/api/.dev.vars',
    };
  }

  const normalized = email.trim().toLowerCase();
  if (!allowedEmails.includes(normalized)) {
    return { ok: false, error: 'Invalid email or password' };
  }

  if (!constantTimeEqual(password, allowedPassword)) {
    return { ok: false, error: 'Invalid email or password' };
  }

  return { ok: true, email: normalized };
}

/** Resolve ELECOM access from admin JWT or member superuser JWT. */
export async function resolveElecomAccess(
  token: string,
  secret: string,
): Promise<ElecomClaims | null> {
  const dedicated = await verifyElecomToken(token, secret);
  if (dedicated) return dedicated;

  const voter = await verifyVoterToken(token, secret);
  if (!voter?.elecom) return null;

  return {
    sub: voter.sub,
    email: voter.email ?? superuserEmailFromClaims(voter),
    role: 'elecom',
  };
}

function superuserEmailFromClaims(voter: { email?: string; name: string }): string {
  return voter.email ?? `${voter.name.toLowerCase().replace(/\s+/g, '.')}@superuser.local`;
}
