'use client';

import { useState } from 'react';
import { inputField, primaryBtn } from '@/lib/layout-classes';

type Props = {
  zones: string[];
};

export function RegisterForm({ zones }: Props) {
  const [licenseCode, setLicenseCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [suffix, setSuffix] = useState('');
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
      body: JSON.stringify({
        licenseCode,
        lastName,
        firstName,
        middleInitial: middleInitial.trim() || undefined,
        suffix: suffix.trim() || undefined,
        zone,
        contactEmail,
      }),
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

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[#1C1C1C]">Legal name</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_minmax(5rem,8rem)]">
          <div>
            <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-[#4D4D4D]">
              Last name
            </label>
            <input
              id="lastName"
              className={inputField}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <div>
            <label htmlFor="suffix" className="mb-2 block text-sm font-semibold text-[#4D4D4D]">
              Suffix
            </label>
            <input
              id="suffix"
              className={inputField}
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="Jr., III"
              maxLength={20}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_minmax(5rem,7rem)]">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-[#4D4D4D]">
              First name
            </label>
            <input
              id="firstName"
              className={inputField}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label htmlFor="middleInitial" className="mb-2 block text-sm font-semibold text-[#4D4D4D]">
              MI
            </label>
            <input
              id="middleInitial"
              className={inputField}
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value)}
              autoComplete="additional-name"
              placeholder="Optional"
              maxLength={10}
            />
          </div>
        </div>
      </fieldset>

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
