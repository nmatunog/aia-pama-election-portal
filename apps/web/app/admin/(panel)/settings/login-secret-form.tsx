'use client';

import { useState } from 'react';
import { inputField, primaryBtn } from '@/lib/layout-classes';

type Props = {
  masked: string | null;
};

export function LoginSecretForm({ masked }: Props) {
  const [newSecret, setNewSecret] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (newSecret !== confirm) {
      setResult({ ok: false, message: 'Secrets do not match.' });
      return;
    }
    if (newSecret.length < 6) {
      setResult({ ok: false, message: 'Secret must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login-secret', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secret: newSecret }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; message?: string };
      if (data.ok) {
        setResult({ ok: true, message: data.message ?? 'Login secret updated.' });
        setNewSecret('');
        setConfirm('');
      } else {
        setResult({ ok: false, message: data.error ?? 'Update failed.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-[#E8E6E3] bg-white p-6">
      <h3 className="text-base font-bold text-[#1C1C1C]">Member login secret</h3>
      <p className="mt-1 text-sm text-[#4D4D4D]">
        This shared secret is what all members enter alongside their license code to sign in.
        Change it here — no server redeployment required.
      </p>

      {masked && (
        <div className="mt-3 rounded-lg bg-[#F5F5F3] px-4 py-3">
          <p className="text-sm text-[#4D4D4D]">
            Current secret: <span className="font-mono font-semibold text-[#1C1C1C]">{masked}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="newSecret" className="mb-1 block text-sm font-semibold text-[#1C1C1C]">
            New secret
          </label>
          <div className="relative">
            <input
              id="newSecret"
              type={show ? 'text' : 'password'}
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              className={`${inputField} pr-20`}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#63A9FA] underline"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmSecret" className="mb-1 block text-sm font-semibold text-[#1C1C1C]">
            Confirm new secret
          </label>
          <input
            id="confirmSecret"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputField}
            placeholder="Re-enter new secret"
            autoComplete="new-password"
            required
          />
        </div>

        {result && (
          <p
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              result.ok
                ? 'bg-[#F0FAF4] text-[#1A7A3A]'
                : 'bg-[#FDF2F5] text-[#D41245]'
            }`}
          >
            {result.message}
          </p>
        )}

        <button type="submit" className={primaryBtn} disabled={loading}>
          {loading ? 'Saving…' : 'Update login secret'}
        </button>
      </form>
    </div>
  );
}
