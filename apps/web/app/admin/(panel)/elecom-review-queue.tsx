'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { actionRowPrimaryFirst, primaryBtn, secondaryBtn } from '@/lib/layout-classes';

export type PendingCandidate = {
  candidateId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  candidateName: string;
  candidateZone: string;
  nominatedAt: string;
};

type Props = {
  electionId: string;
  initial: PendingCandidate[];
};

export function ElecomReviewQueue({ electionId, initial }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function review(candidateId: string, action: 'approve' | 'reject', reason?: string) {
    setBusyId(candidateId);
    setError(null);
    const res = await fetch(`/api/admin/candidates/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        electionId,
        candidateId,
        rejectionReason: reason,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);

    if (!data.ok) {
      setError(data.error ?? 'Action failed');
      return;
    }

    setQueue((q) => q.filter((c) => c.candidateId !== candidateId));
    setRejectId(null);
    setRejectReason('');
    router.refresh();
  }

  if (queue.length === 0) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1C1C1C]">Pending ELECOM approval</h2>
        <p className="mt-2 text-base text-[#4D4D4D]">No candidates awaiting committee review.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-[#1C1C1C]">Pending ELECOM approval</h2>
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      {queue.map((c) => (
        <article
          key={c.candidateId}
          className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6"
        >
          <p className="font-semibold capitalize text-[#1C1C1C]">
            {c.type} — {c.candidateName}
          </p>
          <p className="mt-1 text-sm text-[#4D4D4D]">
            {c.candidateZone}
            {c.zone ? ` · Position zone: ${c.zone}` : ''}
          </p>
          <p className="mt-1 text-xs text-[#4D4D4D]">
            Nominated {new Date(c.nominatedAt).toLocaleString()}
          </p>
          {rejectId === c.candidateId ? (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-[#1C1C1C]">
                Rejection reason (optional)
              </label>
              <textarea
                className="w-full rounded-lg border-2 border-[#E8E6E3] bg-[#F8F7F5] px-4 py-3 text-base"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className={`mt-3 ${actionRowPrimaryFirst}`}>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={busyId === c.candidateId}
                  onClick={() => review(c.candidateId, 'reject', rejectReason)}
                >
                  Confirm reject
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => setRejectId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`mt-4 ${actionRowPrimaryFirst}`}>
              <button
                type="button"
                className={primaryBtn}
                disabled={busyId === c.candidateId}
                onClick={() => review(c.candidateId, 'approve')}
              >
                Approve
              </button>
              <button
                type="button"
                className={secondaryBtn}
                disabled={busyId === c.candidateId}
                onClick={() => setRejectId(c.candidateId)}
              >
                Reject
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
