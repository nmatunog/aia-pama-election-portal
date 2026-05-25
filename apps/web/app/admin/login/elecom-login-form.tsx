'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputField, primaryBtn } from '@/lib/layout-classes';

export function ElecomLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('nmatunog@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };

    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? 'Login failed');
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="elecom-email" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
          ELECOM email
        </label>
        <input
          id="elecom-email"
          type="email"
          autoComplete="username"
          className={inputField}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="elecom-password" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
          Password
        </label>
        <input
          id="elecom-password"
          type="password"
          autoComplete="current-password"
          className={inputField}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      <button type="submit" className={primaryBtn} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in to ELECOM'}
      </button>
      <p className="text-sm text-[#4D4D4D]">
        Superuser: log in at{' '}
        <a href="/login" className="font-semibold text-[#63A9FA] underline">
          Member Login
        </a>{' '}
        with license <code className="text-[#1C1C1C]">007264013</code> and{' '}
        <code className="text-[#1C1C1C]">nmatunog@gmail.com</code>, then open{' '}
        <a href="/admin" className="font-semibold text-[#63A9FA] underline">
          /admin
        </a>
        .
      </p>
    </form>
  );
}
