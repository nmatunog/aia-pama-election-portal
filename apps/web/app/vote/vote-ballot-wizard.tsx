'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RULES } from '@aia-pama/shared';
import { apiPost } from '@/lib/api';
import {
  actionRowPrimaryFirst,
  listScroll,
  primaryBtn,
  secondaryBtn,
} from '@/lib/layout-classes';

export type BallotCandidateOption = {
  id: string;
  fullName: string;
  zone: string | null;
};

export type BallotOptionsData = {
  electionId: string;
  phase: string;
  alreadyVoted: boolean;
  zonal: BallotCandidateOption[];
  national: BallotCandidateOption[];
};

type Props = {
  electionId: string;
  memberZone: string;
  options: BallotOptionsData;
};

type SubmitResponse = {
  ok: boolean;
  receiptToken?: string;
  message?: string;
  error?: string;
};

export function VoteBallotWizard({ electionId, memberZone, options }: Props) {
  const router = useRouter();
  const [zonalId, setZonalId] = useState<string | null>(null);
  const [nationalIds, setNationalIds] = useState<string[]>([]);
  const [step, setStep] = useState<'zonal' | 'national' | 'review' | 'done'>('zonal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  if (options.alreadyVoted) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <p className="text-base font-semibold text-[#1A7A3A]">
          You have already cast your ballot in this election.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-[#63A9FA] underline">
          Back to Dashboard
        </Link>
      </section>
    );
  }

  if (options.zonal.length === 0) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <p className="text-[#D41245]">
          No approved zonal candidates in {memberZone} yet. Voting cannot proceed until
          ELECOM approves candidates for your zone.
        </p>
      </section>
    );
  }

  function toggleNational(id: string) {
    setNationalIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= RULES.MAX_NATIONAL_VOTES) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    if (!zonalId) {
      setError('Select a zonal candidate');
      return;
    }
    setBusy(true);
    setError(null);
    const data = await apiPost<SubmitResponse>('/ballots/submit', {
      electionId,
      zonalVote: { candidateId: zonalId },
      nationalVotes: { candidateIds: nationalIds },
      turnstileToken: 'dev-bypass',
    });
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? 'Ballot submission failed');
      return;
    }
    setReceipt(data.receiptToken ?? null);
    setStep('done');
    router.refresh();
  }

  if (step === 'done') {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#1A7A3A] bg-[#F8F7F5] p-5 sm:p-6">
        <p className="text-lg font-semibold text-[#1A7A3A]">Ballot recorded</p>
        <p className="mt-2 text-base text-[#4D4D4D]">
          {receipt
            ? 'Save this receipt token. It confirms your ballot was accepted without revealing your choices.'
            : 'Your vote has been recorded.'}
        </p>
        {receipt && (
          <p className="mt-4 break-all rounded-lg bg-white px-4 py-3 font-mono text-sm text-[#1C1C1C]">
            {receipt}
          </p>
        )}
        <Link href="/dashboard" className="mt-6 inline-block text-[#63A9FA] underline">
          Back to Dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}

      {step === 'zonal' && (
        <section className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">
            Zonal vote — {memberZone}
          </h2>
          <p className="mt-1 text-sm text-[#4D4D4D]">Choose one candidate (required).</p>
          <ul className={`mt-4 ${listScroll}`}>
            {options.zonal.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-[#E8E6E3] px-4 py-3 has-[:checked]:border-[#D41245]">
                  <input
                    type="radio"
                    name="zonal"
                    checked={zonalId === c.id}
                    onChange={() => setZonalId(c.id)}
                  />
                  <span className="font-semibold text-[#1C1C1C]">{c.fullName}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className={`mt-6 ${actionRowPrimaryFirst}`}>
            <button
              type="button"
              className={primaryBtn}
              disabled={!zonalId}
              onClick={() => setStep('national')}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'national' && (
        <section className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">National vote</h2>
          <p className="mt-1 text-sm text-[#4D4D4D]">
            Choose up to {RULES.MAX_NATIONAL_VOTES} national directors (optional).
          </p>
          {options.national.length === 0 ? (
            <p className="mt-4 text-sm text-[#4D4D4D]">No national candidates on the ballot yet.</p>
          ) : (
            <ul className={`mt-4 ${listScroll}`}>
              {options.national.map((c) => {
                const disabled =
                  nationalIds.length >= RULES.MAX_NATIONAL_VOTES &&
                  !nationalIds.includes(c.id);
                return (
                  <li key={c.id} className="mb-2">
                    <label
                      className={`flex items-center gap-3 rounded-lg border-2 border-[#E8E6E3] px-4 py-3 ${
                        disabled ? 'opacity-50' : 'cursor-pointer has-[:checked]:border-[#D41245]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={nationalIds.includes(c.id)}
                        disabled={disabled}
                        onChange={() => toggleNational(c.id)}
                      />
                      <span className="font-semibold text-[#1C1C1C]">{c.fullName}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={`mt-6 ${actionRowPrimaryFirst}`}>
            <button type="button" className={primaryBtn} onClick={() => setStep('review')}>
              Review ballot
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setStep('zonal')}>
              Back
            </button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">Review &amp; submit</h2>
          <div className="mt-4 space-y-3 text-base">
            <p>
              <span className="font-semibold">Zonal:</span>{' '}
              {options.zonal.find((c) => c.id === zonalId)?.fullName ?? '—'}
            </p>
            <p>
              <span className="font-semibold">National ({nationalIds.length}):</span>{' '}
              {nationalIds.length === 0
                ? 'None'
                : nationalIds
                    .map((id) => options.national.find((c) => c.id === id)?.fullName)
                    .filter(Boolean)
                    .join(', ')}
            </p>
          </div>
          <p className="mt-4 text-sm text-[#4D4D4D]">
            Once submitted, your ballot cannot be changed.
          </p>
          <div className={`mt-6 ${actionRowPrimaryFirst}`}>
            <button type="button" className={primaryBtn} disabled={busy} onClick={submit}>
              {busy ? 'Submitting…' : 'Submit ballot'}
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setStep('national')}>
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
