'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RequestOtpResponse, VerifyOtpResponse } from '@/lib/api';
import { inputField, primaryBtn } from '@/lib/layout-classes';

type Step = 'credentials' | 'otp';

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-[#4D4D4D]">
      Step {current} of 2
    </p>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const [step, setStep] = useState<Step>('credentials');
  const [licenseCode, setLicenseCode] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseCode, contact }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const data = (await res.json()) as RequestOtpResponse;
      if (!data.ok || !data.sessionId) {
        setError(
          data.error ??
            'Could not verify your membership. Ensure the API is running (npm run dev:api).',
        );
        return;
      }
      setSessionId(data.sessionId);
      setDevOtp(data.devOtp ?? null);
      setOtp('');
      setStep('otp');
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      setError(
        aborted
          ? 'Request timed out. Start the API in another terminal: npm run dev:api'
          : 'Network error. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter all 6 digits, then click Verify & Sign In.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseCode, otp, sessionId }),
      });
      const data = (await res.json()) as VerifyOtpResponse;
      if (!data.ok) {
        setError(data.error ?? 'Invalid OTP. Check the code and click Verify & Sign In again.');
        return;
      }
      const dest = nextPath.startsWith('/') ? nextPath : '/dashboard';
      window.location.assign(dest);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillOtpFromDev(code: string) {
    setOtp(code.replace(/\D/g, '').slice(0, 6));
    setError(null);
  }

  if (step === 'otp') {
    return (
      <div className="mt-8 space-y-5">
        <StepIndicator current={2} />

        <div className="rounded-lg border-l-4 border-l-[#1A7A3A] bg-white px-4 py-4 border border-[#E8E6E3]">
          <p className="font-semibold text-[#1A7A3A]">Membership verified</p>
          <p className="mt-1 text-base text-[#4D4D4D]">
            Your license code was checked successfully. A one-time password is ready.
          </p>
        </div>

        <div className="rounded-lg border-2 border-[#D41245] bg-[#FDF2F5] px-4 py-4">
          <p className="text-lg font-semibold text-[#1C1C1C]">
            Enter your 6-digit code, then click Verify &amp; Sign In
          </p>
          <p className="mt-2 text-base text-[#4D4D4D]">
            Do not close this page. After you type or tap the code, press the red button
            below to finish signing in.
          </p>
        </div>

        {devOtp && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#4D4D4D]">
              Development mode — tap to fill your code:
            </p>
            <button
              type="button"
              onClick={() => fillOtpFromDev(devOtp)}
              className="flex w-full min-h-[48px] items-center justify-center gap-1 rounded-xl border-2 border-[#D41245] bg-white px-2 py-3 text-xl font-bold tracking-[0.2em] text-[#D41245] transition-colors hover:bg-[#FDF2F5] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#D41245] sm:gap-2 sm:px-4 sm:py-4 sm:text-2xl sm:tracking-[0.35em]"
              aria-label={`Use verification code ${devOtp.split('').join(' ')}`}
            >
              {devOtp.split('').map((digit, i) => (
                <span
                  key={i}
                  className="inline-flex h-10 w-8 items-center justify-center rounded-lg bg-[#FDF2F5] sm:h-12 sm:w-10"
                >
                  {digit}
                </span>
              ))}
            </button>
            <p className="text-center text-sm text-[#4D4D4D]">
              Or type the digits in the box below
            </p>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <label htmlFor="otp" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
              One-Time Password (6 digits)
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={`${inputField} py-4 text-center text-xl font-bold tracking-[0.25em] sm:text-2xl sm:tracking-[0.35em]`}
              placeholder="• • • • • •"
              autoComplete="one-time-code"
              aria-describedby="otp-hint"
            />
            <p id="otp-hint" className="mt-2 text-sm text-[#4D4D4D]">
              {otp.length}/6 digits entered
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={primaryBtn}
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying…' : 'Verify & Sign In'}
          </button>

          <p className="text-center text-sm text-[#9A6700]">
            Code expires in 10 minutes
          </p>

          <button
            type="button"
            onClick={() => {
              setStep('credentials');
              setOtp('');
              setDevOtp(null);
              setError(null);
            }}
            className="w-full text-center text-base text-[#63A9FA] underline"
          >
            ← Back to Step 1
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleContinue} className="mt-8 space-y-5">
      <StepIndicator current={1} />

      <p className="text-base text-[#4D4D4D]">
        Enter your details below, then click <strong>Continue</strong> to verify your
        membership and receive a one-time password.
      </p>

      <div>
        <label htmlFor="licenseCode" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
          AIA License Code
        </label>
        <input
          id="licenseCode"
          name="licenseCode"
          type="text"
          value={licenseCode}
          onChange={(e) => setLicenseCode(e.target.value)}
          className={inputField}
          placeholder="Your license code"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label htmlFor="contact" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
          Registered Email or Mobile
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={inputField}
          placeholder="email@example.com or mobile"
          autoComplete="email"
          required
        />
      </div>
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      <button type="submit" className={primaryBtn} disabled={loading}>
        {loading ? 'Verifying membership…' : 'Continue'}
      </button>
    </form>
  );
}
