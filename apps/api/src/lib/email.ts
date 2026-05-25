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
      'User-Agent': 'aia-pama-election-api/1.0',
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

    let message = 'Failed to send email. Please try again.';
    try {
      const body = JSON.parse(text) as { message?: string };
      const m = body.message ?? '';
      if (m.includes('only send testing emails to your own email')) {
        message =
          'OTP email could not be sent: Resend test mode only allows mail to the address on your Resend account. Use that email at login, or verify a domain at resend.com/domains and set OTP_EMAIL_FROM on the Worker.';
      } else if (m.includes('API key is invalid') || res.status === 401) {
        message = 'Email service misconfigured (invalid RESEND_API_KEY on Worker).';
      } else if (m) {
        message = `Email could not be sent: ${m}`;
      }
    } catch {
      /* use default message */
    }

    return { ok: false, error: message };
  }

  return { ok: true };
}
