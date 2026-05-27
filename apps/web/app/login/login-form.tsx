'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { inputField, primaryBtn } from '@/lib/layout-classes';

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const [licenseCode, setLicenseCode] = useState('');
  const [loginSecret, setLoginSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseCode, loginSecret }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        member?: { fullName: string; zone: string; isElecom?: boolean };
      };
      if (!data.ok) {
        setError(data.error ?? 'Sign in failed. Check your license code and login secret.');
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

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
        <label htmlFor="loginSecret" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
          Login secret
        </label>
        <div className="relative">
          <input
            id="loginSecret"
            name="loginSecret"
            type={showSecret ? 'text' : 'password'}
            value={loginSecret}
            onChange={(e) => setLoginSecret(e.target.value)}
            className={`${inputField} pr-20`}
            placeholder="Shared login secret from ELECOM"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowSecret((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#63A9FA] underline"
          >
            {showSecret ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      <button type="submit" className={primaryBtn} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
