import { Hono } from 'hono';
import { hashLicenseCode, memberLoginSchema } from '@aia-pama/shared';
import type { Env } from '../env';
import { findMemberByLicenseHash } from '../lib/supabase';
import {
  isSuperuserLicense,
  memberHasElecomPrivileges,
  superuserEmail,
} from '../lib/elecom-auth-config';
import { signVoterToken, verifyVoterToken } from '../lib/jwt';

export const authRoutes = new Hono<{ Bindings: Env }>();

function checkMemberEligibility(member: {
  approval_status?: string;
  active: boolean;
  good_standing: boolean;
}): { ok: true } | { ok: false; error: string; status: 400 | 403 } {
  const approval = member.approval_status ?? 'approved';
  if (approval === 'pending_approval') {
    return { ok: false, error: 'Your membership signup is pending ELECOM approval.', status: 403 };
  }
  if (approval === 'rejected') {
    return { ok: false, error: 'Membership application was not approved.', status: 403 };
  }
  if (!member.active && !member.good_standing) {
    return {
      ok: false,
      error:
        'Your membership is on file but not yet active. If ELECOM recently approved you, ask them to confirm good standing and active status.',
      status: 403,
    };
  }
  if (!member.active) {
    return { ok: false, error: 'Your membership account is inactive. Contact ELECOM for assistance.', status: 403 };
  }
  if (!member.good_standing) {
    return { ok: false, error: 'Your membership is not in good standing. Contact ELECOM for assistance.', status: 403 };
  }
  return { ok: true };
}

/** License code + shared secret login — no email required */
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = memberLoginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { licenseCode, loginSecret } = parsed.data;

  const configuredSecret = c.env.MEMBER_LOGIN_SECRET;
  if (!configuredSecret) {
    return c.json({ ok: false, error: 'Login is not configured. Contact ELECOM.' }, 503);
  }
  if (loginSecret !== configuredSecret) {
    return c.json({ ok: false, error: 'Invalid license code or login secret.' }, 401);
  }

  const licenseHash = await hashLicenseCode(licenseCode);
  const member = await findMemberByLicenseHash(c.env, licenseHash);

  if (!member) {
    return c.json(
      { ok: false, error: 'License code not found. New members may register at /register for ELECOM approval.' },
      400,
    );
  }

  const eligibility = checkMemberEligibility(member);
  if (!eligibility.ok) {
    return c.json({ ok: false, error: eligibility.error }, eligibility.status);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ ok: false, error: 'Server misconfigured' }, 500);
  }

  const isSuperuser = await isSuperuserLicense(c.env, licenseCode);
  const isElecom = memberHasElecomPrivileges(c.env, member, licenseCode);
  const elecomEmail =
    member.contact_email?.trim() || (isElecom ? superuserEmail(c.env) : undefined);

  const token = await signVoterToken(
    {
      sub: member.id,
      name: member.full_name,
      zone: member.zone,
      licenseHash,
      elecom: isElecom,
      superuser: isSuperuser,
      email: isElecom ? elecomEmail : undefined,
    },
    secret,
  );

  return c.json({
    ok: true,
    token,
    member: {
      fullName: member.full_name,
      zone: member.zone,
      isElecom,
    },
  });
});

/** @deprecated — kept for backward compat; use /auth/login */
authRoutes.post('/request-otp', async (c) => {
  return c.json(
    { ok: false, error: 'OTP login is disabled. Use license code + login secret at /login.' },
    410,
  );
});

/** @deprecated — kept for backward compat; use /auth/login */
authRoutes.post('/verify-otp', async (c) => {
  return c.json(
    { ok: false, error: 'OTP login is disabled. Use license code + login secret at /login.' },
    410,
  );
});

authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
  const secret = c.env.JWT_SECRET;

  if (!token || !secret) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const claims = await verifyVoterToken(token, secret);
  if (!claims) {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }

  return c.json({
    ok: true,
    member: {
      fullName: claims.name,
      zone: claims.zone,
      isElecom: claims.elecom === true,
    },
  });
});
