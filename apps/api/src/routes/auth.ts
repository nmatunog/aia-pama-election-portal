import { Hono } from 'hono';
import { hashLicenseCode, requestOtpSchema, verifyOtpSchema } from '@aia-pama/shared';
import type { Env } from '../env';
import { findMemberByLicenseHash } from '../lib/supabase';
import {
  generateOtp,
  prepareMemberSession,
  verifyOtpSession,
} from '../lib/otp-store';
import { isSuperuserLicense, superuserEmail } from '../lib/elecom-auth-config';
import { signVoterToken, verifyVoterToken } from '../lib/jwt';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/request-otp', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = requestOtpSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      400,
    );
  }

  const { licenseCode, contact } = parsed.data;
  const licenseHash = await hashLicenseCode(licenseCode);
  const member = await findMemberByLicenseHash(c.env, licenseHash);

  if (!member) {
    return c.json({ ok: false, error: 'License code not found in roster' }, 404);
  }
  if (!member.good_standing || !member.active) {
    return c.json({ ok: false, error: 'Member is not eligible to participate' }, 403);
  }

  const sessionId = crypto.randomUUID();
  prepareMemberSession(
    sessionId,
    licenseHash,
    member.id,
    contact,
    member.full_name,
  );
  const otp = generateOtp(sessionId);

  if (!otp) {
    return c.json({ ok: false, error: 'Could not generate OTP session' }, 500);
  }

  const response: {
    ok: true;
    sessionId: string;
    devOtp?: string;
  } = { ok: true, sessionId };

  if (c.env.ENVIRONMENT === 'development') {
    response.devOtp = otp;
  }

  return c.json(response);
});

authRoutes.post('/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      400,
    );
  }

  const { licenseCode, otp, sessionId } = parsed.data;
  const licenseHash = await hashLicenseCode(licenseCode);
  const verified = verifyOtpSession(sessionId, licenseHash, otp);

  if (!verified.ok) {
    return c.json({ ok: false, error: 'Invalid or expired OTP' }, 401);
  }

  const member = await findMemberByLicenseHash(c.env, licenseHash);
  if (!member) {
    return c.json({ ok: false, error: 'Member not found' }, 404);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ ok: false, error: 'Server misconfigured' }, 500);
  }

  const superuser = await isSuperuserLicense(c.env, parsed.data.licenseCode);
  const token = await signVoterToken(
    {
      sub: member.id,
      name: member.full_name,
      zone: member.zone,
      licenseHash,
      elecom: superuser,
      email: superuser ? superuserEmail(c.env) : undefined,
    },
    secret,
  );

  return c.json({
    ok: true,
    token,
    member: {
      fullName: member.full_name,
      zone: member.zone,
      isElecom: superuser,
    },
  });
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
