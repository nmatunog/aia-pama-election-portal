import type { Env } from '../env';

export async function sendOtpEmail(
  env: Env,
  to: string,
  otp: string,
  memberName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Email service not configured (RESEND_API_KEY)' };
  }

  if (!to.includes('@')) {
    return {
      ok: false,
      error: 'SMS not yet supported. Use a registered email address.',
    };
  }

  const from = env.OTP_EMAIL_FROM ?? 'AIA-PAMA Election <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your AIA-PAMA Election OTP',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #D41245;">AIA-PAMA Election Portal</h2>
          <p>Hello ${memberName},</p>
          <p>Your one-time password (OTP) for sign-in is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1C1C1C;">${otp}</p>
          <p style="color: #4D4D4D;">This code expires in 10 minutes. Do not share it with anyone.</p>
          <p style="color: #4D4D4D; font-size: 14px;">If you did not request this code, contact ELECOM immediately.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', res.status, text);
    return { ok: false, error: 'Failed to send email. Please try again.' };
  }

  return { ok: true };
}
