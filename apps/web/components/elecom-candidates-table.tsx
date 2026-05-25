'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { primaryBtn, secondaryBtn } from '@/lib/layout-classes';

export type AdminCandidateRow = {
  candidateId: string;
  memberId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  rejectionReason: string | null;
  candidateName: string;
  candidateZone: string;
  nominatedAt: string;
  nominatorName: string;
};

const STATUSES = [
  'pending_acceptance',
  'declined',
  'pending_approval',
  'approved',
  'rejected',
] as const;

type Props = {
  electionId: string;
  initial: AdminCandidateRow[];
  initialFilter: string;
};

export function ElecomCandidatesTable({ electionId, initial, initialFilter }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState(initialFilter);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('pending_approval');
  const [editReason, setEditReason] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function reload(status: string) {
    const res = await fetch(`/api/admin/candidates?status=${encodeURIComponent(status)}`);
    const data = (await res.json()) as { ok: boolean; candidates?: AdminCandidateRow[] };
    if (data.ok && data.candidates) setRows(data.candidates);
  }

  async function onFilterChange(status: string) {
    setFilter(status);
    await reload(status);
  }

  async function saveStatus(candidateId: string) {
    setBusyId(candidateId);
    setError(null);
    const res = await fetch('/api/admin/candidates/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        electionId,
        candidateId,
        status: editStatus,
        rejectionReason: editStatus === 'rejected' ? editReason : undefined,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.error ?? 'Update failed');
      return;
    }
    setEditId(null);
    await reload(filter);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-[#1C1C1C]">
          Status filter
          <select
            className="ml-2 rounded-lg border-2 border-[#E8E6E3] bg-white px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-[#4D4D4D]">{filtered.length} shown</p>
      </div>

      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border-2 border-[#E8E6E3] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#E8E6E3] bg-[#F8F7F5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Nominee</th>
              <th className="px-4 py-3 font-semibold">Type / zone</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Nominator</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#4D4D4D]">
                  No nominees match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.candidateId} className="border-b border-[#E8E6E3] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1C1C1C]">{c.candidateName}</p>
                    <p className="text-xs text-[#4D4D4D]">{c.candidateZone}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {c.type}
                    {c.zone ? ` · ${c.zone}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#F8F7F5] px-2 py-0.5 text-xs font-medium">
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    {c.rejectionReason && (
                      <p className="mt-1 text-xs text-[#D41245]">{c.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#4D4D4D]">{c.nominatorName}</td>
                  <td className="px-4 py-3">
                    {editId === c.candidateId ? (
                      <div className="space-y-2 min-w-[14rem]">
                        <select
                          className="w-full rounded border-2 border-[#E8E6E3] px-2 py-1"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                        {editStatus === 'rejected' && (
                          <input
                            className="w-full rounded border-2 border-[#E8E6E3] px-2 py-1 text-xs"
                            placeholder="Rejection reason"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={primaryBtn}
                            disabled={busyId === c.candidateId}
                            onClick={() => saveStatus(c.candidateId)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={secondaryBtn}
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={secondaryBtn}
                        onClick={() => {
                          setEditId(c.candidateId);
                          setEditStatus(c.status);
                          setEditReason(c.rejectionReason ?? '');
                        }}
                      >
                        Edit status
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
