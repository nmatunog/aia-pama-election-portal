'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormattedDateTime } from '@/components/formatted-datetime';
import { primaryBtn, secondaryBtn } from '@/lib/layout-classes';

export type MemberApplication = {
  memberId: string;
  fullName: string;
  position: string | null;
  agencyName: string | null;
  zone: string;
  contactEmail: string | null;
  registeredAt: string;
};

type Props = {
  initial: MemberApplication[];
};

export function ElecomMemberApplications({ initial }: Props) {
  const router = useRouter();
  const [apps, setApps] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(
    memberId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string,
  ) {
    setBusyId(memberId);
    setError(null);
    const res = await fetch('/api/admin/members/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, decision, rejectionReason }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.error ?? 'Action failed');
      return;
    }
    setApps((list) => list.filter((a) => a.memberId !== memberId));
    router.refresh();
  }

  if (apps.length === 0) {
    return (
      <p className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-6 text-sm text-[#4D4D4D]">
        No pending membership applications. New signups at{' '}
        <a href="/register" className="font-semibold text-[#63A9FA] underline" target="_blank" rel="noreferrer">
          /register
        </a>{' '}
        appear here for ELECOM approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}
      {apps.map((a) => (
        <div
          key={a.memberId}
          className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5"
        >
          <p className="font-semibold text-[#1C1C1C]">{a.fullName}</p>
          <p className="mt-1 text-sm text-[#4D4D4D]">
            {a.position ?? '—'} · {a.agencyName ?? '—'}
          </p>
          <p className="mt-1 text-sm text-[#4D4D4D]">
            {a.zone} · {a.contactEmail ?? '—'} · applied{' '}
            <FormattedDateTime iso={a.registeredAt} />
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={busyId === a.memberId}
              onClick={() => review(a.memberId, 'approved')}
            >
              Approve
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={busyId === a.memberId}
              onClick={() =>
                review(a.memberId, 'rejected', 'Not approved by ELECOM')
              }
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
