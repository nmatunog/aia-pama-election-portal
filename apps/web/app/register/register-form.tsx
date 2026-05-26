'use client';

import { useState } from 'react';
import { inputField, primaryBtn } from '@/lib/layout-classes';

type Props = {
  zones: string[];
};

export function RegisterForm({ zones }: Props) {
  const [licenseCode, setLicenseCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState(zones[0] ?? '');
  const [contactEmail, setContactEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await fetch('/api/public/member-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseCode, fullName, zone, contactEmail }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? 'Could not submit application');
      return;
    }
    setDone(data.message ?? 'Application submitted.');
  }

  if (done) {
    return (
      <div className="mt-8 rounded-xl border-2 border-[#1A7A3A] bg-[#F8F7F5] p-6">
        <p className="font-semibold text-[#1A7A3A]">Application received</p>
        <p className="mt-2 text-sm text-[#4D4D4D]">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="licenseCode" className="mb-2 block text-base font-semibold">
          AIA license code
        </label>
        <input
          id="licenseCode"
          className={inputField}
          value={licenseCode}
          onChange={(e) => setLicenseCode(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="fullName" className="mb-2 block text-base font-semibold">
          Full name
        </label>
        <input
          id="fullName"
          className={inputField}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="zone" className="mb-2 block text-base font-semibold">
          Zone
        </label>
        <select
          id="zone"
          className={inputField}
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-base font-semibold">
          Email (for OTP login)
        </label>
        <input
          id="email"
          type="email"
          className={inputField}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      <button type="submit" className={primaryBtn} disabled={busy}>
        {busy ? 'Submitting…' : 'Submit for ELECOM approval'}
      </button>
    </form>
  );
}
