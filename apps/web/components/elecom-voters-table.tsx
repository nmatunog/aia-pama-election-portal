'use client';

import { ZONES } from '@aia-pama/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormattedDateTime } from '@/components/formatted-datetime';
import { primaryBtn } from '@/lib/layout-classes';

export type AdminVoterRow = {
  memberId: string;
  fullName: string;
  zone: string;
  goodStanding: boolean;
  active: boolean;
  approvalStatus?: string;
  contactEmail?: string | null;
  hasVoted: boolean;
  votedAt: string | null;
};

type Props = {
  initial: AdminVoterRow[];
  initialZone: string;
  stats: { total: number; eligible: number; voted: number };
};

export function ElecomVotersTable({ initial, initialZone, stats }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [zone, setZone] = useState(initialZone);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStats, setLocalStats] = useState(stats);

  async function reload(z: string) {
    const qs = z && z !== 'all' ? `?zone=${encodeURIComponent(z)}` : '';
    const res = await fetch(`/api/admin/voters${qs}`);
    const data = (await res.json()) as {
      ok: boolean;
      voters?: AdminVoterRow[];
      stats?: typeof stats;
    };
    if (data.ok) {
      if (data.voters) setRows(data.voters);
      if (data.stats) setLocalStats(data.stats);
    }
  }

  async function deleteMember(memberId: string) {
    if (!window.confirm('Permanently remove this member from the roster?')) return;
    setBusyId(memberId);
    setError(null);
    const res = await fetch('/api/admin/members/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, confirm: true }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.error ?? 'Delete failed');
      return;
    }
    await reload(zone);
    router.refresh();
  }

  async function updateMember(
    memberId: string,
    patch: { goodStanding?: boolean; active?: boolean },
  ) {
    setBusyId(memberId);
    setError(null);
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, ...patch }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.error ?? 'Update failed');
      return;
    }
    await reload(zone);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.total}</p>
          <p className="text-xs text-[#4D4D4D]">In roster</p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.eligible}</p>
          <p className="text-xs text-[#4D4D4D]">Eligible (active + good standing)</p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.voted}</p>
          <p className="text-xs text-[#4D4D4D]">Voted</p>
        </div>
      </div>

      <label className="text-sm font-semibold text-[#1C1C1C]">
        Zone filter
        <select
          className="ml-2 rounded-lg border-2 border-[#E8E6E3] bg-white px-3 py-2 text-sm"
          value={zone}
          onChange={(e) => {
            setZone(e.target.value);
            reload(e.target.value);
          }}
        >
          <option value="all">All zones</option>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border-2 border-[#E8E6E3] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#E8E6E3] bg-[#F8F7F5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 font-semibold">Zone</th>
              <th className="px-4 py-3 font-semibold">Good standing</th>
              <th className="px-4 py-3 font-semibold">Active</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Voted</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.memberId} className="border-b border-[#E8E6E3] last:border-0">
                <td className="px-4 py-3 font-semibold">{v.fullName}</td>
                <td className="px-4 py-3">{v.zone}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={busyId === v.memberId}
                    onClick={() =>
                      updateMember(v.memberId, { goodStanding: !v.goodStanding })
                    }
                  >
                    {v.goodStanding ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={busyId === v.memberId}
                    onClick={() => updateMember(v.memberId, { active: !v.active })}
                  >
                    {v.active ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs capitalize text-[#4D4D4D]">
                  {v.approvalStatus ?? 'approved'}
                </td>
                <td className="px-4 py-3 text-[#4D4D4D]">
                  {v.hasVoted
                    ? <FormattedDateTime iso={v.votedAt!} />
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {!v.active && !v.hasVoted && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#D41245] underline"
                      disabled={busyId === v.memberId}
                      onClick={() => deleteMember(v.memberId)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
