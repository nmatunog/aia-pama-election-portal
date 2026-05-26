'use client';

import { ZONES } from '@aia-pama/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FormattedDateTime } from '@/components/formatted-datetime';
import { ElecomMemberProfileEditor } from '@/components/elecom-member-profile-editor';
import { adminFetch } from '@/lib/admin-fetch';
import { inputField, primaryBtn } from '@/lib/layout-classes';

type MemberAction =
  | 'approved'
  | 'disapproved'
  | 'grant_elecom'
  | 'revoke_elecom'
  | 'delete';

function memberActionOptions(
  v: AdminVoterRow,
  canGrantElecom: boolean,
): { value: MemberAction; label: string }[] {
  const options: { value: MemberAction; label: string }[] = [];
  const pending = v.approvalStatus === 'pending_approval';
  const approved = (v.approvalStatus ?? 'approved') === 'approved';

  if (pending) {
    options.push({ value: 'approved', label: 'Approved' });
    options.push({ value: 'disapproved', label: 'Disapproved' });
    options.push({ value: 'delete', label: 'Delete application' });
  }

  if (canGrantElecom && approved) {
    options.push({
      value: v.isElecom ? 'revoke_elecom' : 'grant_elecom',
      label: v.isElecom ? 'Revoke ELECOM' : 'Grant ELECOM',
    });
  }

  if (!pending && !v.active && !v.hasVoted && !v.isElecom) {
    options.push({ value: 'delete', label: 'Delete member' });
  }

  return options;
}

export type AdminVoterRow = {
  memberId: string;
  fullName: string;
  zone: string;
  position: string | null;
  agencyName: string | null;
  goodStanding: boolean;
  active: boolean;
  approvalStatus?: string;
  contactEmail?: string | null;
  registeredAt?: string | null;
  isElecom?: boolean;
  hasVoted: boolean;
  votedAt: string | null;
};

type RosterStats = {
  total: number;
  pending: number;
  eligible: number;
  voted: number;
};

type StatusFilter = 'all' | 'pending_approval' | 'approved' | 'rejected';

type Props = {
  initial: AdminVoterRow[];
  initialZone: string;
  stats: RosterStats;
  /** Superuser only — grant or revoke ELECOM admin on the roster */
  canGrantElecom?: boolean;
};

export function ElecomVotersTable({
  initial,
  initialZone,
  stats,
  canGrantElecom = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('filter');
  const [rows, setRows] = useState(initial);
  const [zone, setZone] = useState(initialZone);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialStatus === 'pending'
      ? 'pending_approval'
      : initialStatus === 'approved'
        ? 'approved'
        : initialStatus === 'rejected'
          ? 'rejected'
          : 'all',
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStats, setLocalStats] = useState(stats);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => (r.approvalStatus ?? 'approved') === statusFilter);
  }, [rows, statusFilter]);

  async function reload(z: string) {
    const qs = z && z !== 'all' ? `?zone=${encodeURIComponent(z)}` : '';
    const res = await adminFetch(`/api/admin/voters${qs}`);
    const data = (await res.json()) as {
      ok: boolean;
      voters?: AdminVoterRow[];
      stats?: RosterStats;
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
    const res = await adminFetch('/api/admin/members/delete', {
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

  async function reviewSignup(memberId: string, decision: 'approved' | 'rejected') {
    setBusyId(memberId);
    setError(null);
    const res = await adminFetch('/api/admin/members/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId,
        decision,
        rejectionReason: decision === 'rejected' ? 'Not approved by ELECOM' : undefined,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusyId(null);
    if (!data.ok) {
      setError(data.error ?? 'Approval failed');
      return;
    }
    await reload(zone);
    router.refresh();
  }

  async function updateMember(
    memberId: string,
    patch: {
      goodStanding?: boolean;
      active?: boolean;
      position?: string;
      agencyName?: string;
      isElecom?: boolean;
    },
  ) {
    setBusyId(memberId);
    setError(null);
    const res = await adminFetch('/api/admin/members', {
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

  async function runMemberAction(memberId: string, action: MemberAction) {
    switch (action) {
      case 'approved':
        await reviewSignup(memberId, 'approved');
        break;
      case 'disapproved':
        await reviewSignup(memberId, 'rejected');
        break;
      case 'grant_elecom':
        await updateMember(memberId, { isElecom: true });
        break;
      case 'revoke_elecom':
        if (
          !window.confirm(
            'Remove ELECOM admin access? They must sign in again for changes to apply.',
          )
        ) {
          return;
        }
        await updateMember(memberId, { isElecom: false });
        break;
      case 'delete':
        await deleteMember(memberId);
        break;
      default:
        break;
    }
  }

  const statusTabs: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: localStats.total },
    { id: 'pending_approval', label: 'Pending signup', count: localStats.pending },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.total}</p>
          <p className="text-xs text-[#4D4D4D]">In roster</p>
        </div>
        <div className="rounded-lg border-2 border-[#9A6700]/40 bg-[#FFFBEB] px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#9A6700]">{localStats.pending}</p>
          <p className="text-xs text-[#4D4D4D]">Pending signup</p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.eligible}</p>
          <p className="text-xs text-[#4D4D4D]">Eligible to vote</p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center">
          <p className="text-xl font-bold text-[#D41245]">{localStats.voted}</p>
          <p className="text-xs text-[#4D4D4D]">Ballots cast</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === tab.id
                ? 'bg-[#D41245] text-white'
                : 'border-2 border-[#E8E6E3] bg-white text-[#1C1C1C] hover:border-[#D41245]/40'
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-semibold text-[#1C1C1C]">
          Zone
          <select
            className="ml-2 rounded-lg border-2 border-[#E8E6E3] bg-white px-3 py-2 text-sm"
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              void reload(e.target.value);
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
      </div>

      {localStats.pending > 0 && statusFilter !== 'pending_approval' && (
        <p className="rounded-lg border-2 border-[#9A6700] bg-[#FFFBEB] px-4 py-3 text-sm text-[#1C1C1C]">
          <strong>{localStats.pending}</strong> signup(s) need approval — open the{' '}
          <button
            type="button"
            className="font-semibold text-[#63A9FA] underline"
            onClick={() => setStatusFilter('pending_approval')}
          >
            Pending signup
          </button>{' '}
          filter and choose <strong>Approved</strong> or <strong>Disapproved</strong> in Actions.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}

      {filteredRows.length === 0 ? (
        <p className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-6 text-sm text-[#4D4D4D]">
          No members match this filter. New applications appear under{' '}
          <strong>Pending signup</strong> after registering at /register.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border-2 border-[#E8E6E3] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E8E6E3] bg-[#F8F7F5]">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Position / agency</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Membership</th>
                <th className="px-4 py-3 font-semibold">Good standing</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">Voted</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((v) => {
                const pending = v.approvalStatus === 'pending_approval';
                const approved = (v.approvalStatus ?? 'approved') === 'approved';
                return (
                  <tr
                    key={v.memberId}
                    className={`border-b border-[#E8E6E3] last:border-0 ${
                      pending ? 'bg-[#FFFBEB]/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1C1C1C]">
                        {v.fullName}
                        {v.isElecom && (
                          <span className="ml-2 rounded bg-[#D41245] px-2 py-0.5 text-xs font-semibold text-white">
                            ELECOM
                          </span>
                        )}
                      </p>
                      {v.contactEmail && (
                        <p className="mt-1 text-xs text-[#4D4D4D]">{v.contactEmail}</p>
                      )}
                      {v.registeredAt && (
                        <p className="mt-1 text-xs text-[#4D4D4D]">
                          Applied <FormattedDateTime iso={v.registeredAt} />
                        </p>
                      )}
                    </td>
                    <td className="min-w-[11rem] px-4 py-3">
                      <ElecomMemberProfileEditor
                        memberId={v.memberId}
                        initialPosition={v.position}
                        initialAgencyName={v.agencyName}
                        busy={busyId === v.memberId}
                        onBusyChange={(b) => setBusyId(b ? v.memberId : null)}
                        onError={setError}
                        onSaved={() => void reload(zone)}
                        compact
                      />
                    </td>
                    <td className="px-4 py-3">{v.zone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          pending
                            ? 'text-[#9A6700]'
                            : v.approvalStatus === 'rejected'
                              ? 'text-[#D41245]'
                              : 'text-[#1A7A3A]'
                        }`}
                      >
                        {(v.approvalStatus ?? 'approved').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {pending ? (
                        <span className="text-xs text-[#4D4D4D]">After approve</span>
                      ) : (
                        <button
                          type="button"
                          className={primaryBtn}
                          disabled={busyId === v.memberId || !approved}
                          onClick={() =>
                            updateMember(v.memberId, { goodStanding: !v.goodStanding })
                          }
                        >
                          {v.goodStanding ? 'Yes' : 'No'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pending ? (
                        <span className="text-xs text-[#4D4D4D]">After approve</span>
                      ) : (
                        <button
                          type="button"
                          className={primaryBtn}
                          disabled={busyId === v.memberId || !approved}
                          onClick={() => updateMember(v.memberId, { active: !v.active })}
                        >
                          {v.active ? 'Yes' : 'No'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#4D4D4D]">
                      {v.hasVoted ? <FormattedDateTime iso={v.votedAt!} /> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const actions = memberActionOptions(v, canGrantElecom);
                        if (actions.length === 0) {
                          return <span className="text-xs text-[#4D4D4D]">—</span>;
                        }
                        return (
                          <select
                            className={`${inputField} min-w-[10.5rem] py-2 text-sm`}
                            defaultValue=""
                            disabled={busyId === v.memberId}
                            aria-label={`Actions for ${v.fullName}`}
                            onChange={(e) => {
                              const action = e.target.value as MemberAction;
                              e.target.value = '';
                              if (!action) return;
                              void runMemberAction(v.memberId, action);
                            }}
                          >
                            <option value="">Choose action…</option>
                            {actions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
