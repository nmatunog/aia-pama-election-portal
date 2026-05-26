import { Hono } from 'hono';
import { hashLicenseCode, requestOtpSchema, verifyOtpSchema } from '@aia-pama/shared';
import type { Env } from '../env';
import { findMemberByLicenseHash } from '../lib/supabase';
import { sendOtpEmail } from '../lib/email';
import { saveOtpSession, verifyOtpSessionDb } from '../lib/supabase-otp';
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
    return c.json(
      {
        ok: false,
        error:
          'License code not found. New members may register at /register for ELECOM approval.',
      },
      400,
    );
  }
  const approval = member.approval_status ?? 'approved';
  if (approval === 'pending_approval') {
    return c.json(
      {
        ok: false,
        error: 'Your membership signup is pending ELECOM approval.',
      },
      403,
    );
  }
  if (approval === 'rejected') {
    return c.json({ ok: false, error: 'Membership application was not approved.' }, 403);
  }
  if (!member.good_standing || !member.active) {
    return c.json({ ok: false, error: 'Member is not eligible to participate' }, 403);
  }

  const sessionId = crypto.randomUUID();
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  const saved = await saveOtpSession(c.env, {
    sessionId,
    licenseHash,
    memberId: member.id,
    contact,
    memberName: member.full_name,
    otp,
  });

  if (!saved.ok) {
    return c.json({ ok: false, error: saved.error }, 500);
  }

  const isDev = c.env.ENVIRONMENT === 'development';

  if (!isDev) {
    const emailed = await sendOtpEmail(c.env, contact, otp, member.full_name);
    if (!emailed.ok) {
      return c.json({ ok: false, error: emailed.error }, 503);
    }
  }

  const response: {
    ok: true;
    sessionId: string;
    devOtp?: string;
    message?: string;
  } = {
    ok: true,
    sessionId,
    message: isDev
      ? 'Development mode: use the code shown below.'
      : 'If this email is registered, a one-time code was sent. Check your inbox and spam folder.',
  };

  if (isDev) {
    response.devOtp = otp;
    if (c.env.RESEND_API_KEY) {
      const emailed = await sendOtpEmail(c.env, contact, otp, member.full_name);
      if (!emailed.ok) {
        response.message = `${response.message} (Email not sent: ${emailed.error})`;
      }
    }
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
  const verified = await verifyOtpSessionDb(c.env, sessionId, licenseHash, otp);

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
