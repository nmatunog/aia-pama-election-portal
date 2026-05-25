'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormattedDateTime } from '@/components/formatted-datetime';
import { primaryBtn } from '@/lib/layout-classes';

type Props = {
  electionId: string;
  cycleYear: number;
  phase: string;
  certifiedAt: string | null;
  turnout: number;
  canCertify: boolean;
};

export function ElecomCertifyPanel({
  electionId,
  cycleYear,
  phase,
  certifiedAt,
  turnout,
  canCertify,
}: Props) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function certify() {
    if (!confirmed) {
      setError('Please confirm before certifying.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch('/api/admin/election/certify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId, confirm: true }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? 'Certification failed');
      return;
    }
    setMessage(data.message ?? 'Election certified.');
    router.refresh();
  }

  if (phase === 'certified' && certifiedAt) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#1A7A3A] bg-[#F8F7F5] p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1A7A3A]">
          Certified
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[#1C1C1C]">
          {cycleYear} election results are official
        </h3>
        <p className="mt-2 text-sm text-[#4D4D4D]">
          Certified on{' '}
          <FormattedDateTime iso={certifiedAt} className="font-semibold text-[#1C1C1C]" />
          . Members see the announcement on their dashboard and on{' '}
          <a href="/candidates" className="font-semibold text-[#63A9FA] underline" target="_blank" rel="noreferrer">
            Election information
          </a>
          .
        </p>
      </section>
    );
  }

  if (!canCertify) {
    return null;
  }

  return (
    <section className="mt-8 rounded-xl border-2 border-[#D41245] bg-[#FDF2F5] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#D41245]">
        Final step
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[#1C1C1C]">Certify election results</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#4D4D4D]">
        After canvassing is complete, certify the {cycleYear} election to publish the{' '}
        <strong>official announcement</strong> on every member&apos;s dashboard. This applies
        Election Code rules: zonal directors by zone, five national seats excluding anyone
        who won a zonal election.
      </p>
      <p className="mt-2 text-sm text-[#4D4D4D]">
        Ballots cast: <span className="font-semibold">{turnout}</span>
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#1C1C1C]">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-2 border-[#E8E6E3]"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          I confirm that ELECOM has reviewed the canvassing results and authorizes
          publication of the certified results to all members. This action cannot be undone
          from the portal.
        </span>
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={primaryBtn}
          disabled={busy || !confirmed}
          onClick={certify}
        >
          {busy ? 'Certifying…' : 'Certify & publish announcement'}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-[#1A7A3A]">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm font-medium text-[#D41245]">{error}</p>
      )}
      <p className="mt-3 text-xs text-[#4D4D4D]">
        Certification is only available here — not via the phase dropdown below.
      </p>
    </section>
  );
}
