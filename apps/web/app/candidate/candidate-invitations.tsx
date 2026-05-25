'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { actionRowPrimaryFirst, primaryBtn, secondaryBtn } from '@/lib/layout-classes';

export type CandidateInvitation = {
  candidateId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  nominatedAt: string;
  nominationId: string;
  nominatorName: string;
};

type Props = {
  electionId: string;
  invitations: CandidateInvitation[];
};

type ResponseResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

export function CandidateInvitations({ electionId, invitations: initial }: Props) {
  const [invitations, setInvitations] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function respond(candidateId: string, action: 'accept' | 'decline') {
    setBusyId(candidateId);
    setError(null);
    setSuccess(null);

    const result = await apiPost<ResponseResult>(`/candidates/${action}`, {
      electionId,
      candidateId,
    });

    setBusyId(null);

    if (!result.ok) {
      setError(result.error ?? 'Request failed');
      return;
    }

    setInvitations((list) => list.filter((i) => i.candidateId !== candidateId));
    setSuccess(result.message ?? (action === 'accept' ? 'Nomination accepted.' : 'Nomination declined.'));
  }

  if (invitations.length === 0) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:mt-10 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1C1C1C]">Nomination invitations</h2>
        <p className="mt-2 text-base text-[#4D4D4D]">
          You have no pending nominations to review. When a member nominates you, they will
          appear here for acceptance or decline.
        </p>
        {success && (
          <p className="mt-4 rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
            {success}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4 sm:mt-10">
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-sm font-medium text-[#1C1C1C]">
          {success}
        </p>
      )}

      {invitations.map((inv) => (
        <article
          key={inv.candidateId}
          className="rounded-xl border-2 border-[#D41245] bg-white p-5 sm:p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-[#D41245]">
            Nomination invitation
          </p>
          <h2 className="mt-2 text-lg font-semibold capitalize text-[#1C1C1C] sm:text-xl">
            {inv.type} Board of Directors
          </h2>
          <ul className="mt-3 space-y-1 text-base text-[#4D4D4D]">
            <li>
              <span className="font-semibold text-[#1C1C1C]">Nominated by:</span>{' '}
              {inv.nominatorName}
            </li>
            {inv.type === 'zonal' && inv.zone && (
              <li>
                <span className="font-semibold text-[#1C1C1C]">Zone:</span> {inv.zone}
              </li>
            )}
            <li>
              <span className="font-semibold text-[#1C1C1C]">Received:</span>{' '}
              {new Date(inv.nominatedAt).toLocaleString()}
            </li>
          </ul>
          <p className="mt-4 text-sm text-[#4D4D4D]">
            Accepting sends your candidacy to ELECOM for approval. Declining cannot be undone
            for this nomination.
          </p>
          <div className={`mt-6 ${actionRowPrimaryFirst}`}>
            <button
              type="button"
              className={primaryBtn}
              disabled={busyId === inv.candidateId}
              onClick={() => respond(inv.candidateId, 'accept')}
            >
              {busyId === inv.candidateId ? 'Processing…' : 'Accept nomination'}
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={busyId === inv.candidateId}
              onClick={() => respond(inv.candidateId, 'decline')}
            >
              Decline
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
