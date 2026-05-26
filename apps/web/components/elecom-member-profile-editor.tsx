'use client';

import { MEMBER_POSITIONS } from '@aia-pama/shared';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { inputField, primaryBtn, secondaryBtn } from '@/lib/layout-classes';

type Props = {
  memberId: string;
  initialPosition: string | null;
  initialAgencyName: string | null;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string) => void;
  onSaved?: () => void;
  compact?: boolean;
};

export function ElecomMemberProfileEditor({
  memberId,
  initialPosition,
  initialAgencyName,
  busy = false,
  onBusyChange,
  onError,
  onSaved,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [position, setPosition] = useState(
    initialPosition && MEMBER_POSITIONS.includes(initialPosition as (typeof MEMBER_POSITIONS)[number])
      ? initialPosition
      : MEMBER_POSITIONS[0],
  );
  const [agencyName, setAgencyName] = useState(initialAgencyName ?? '');

  async function save() {
    onBusyChange?.(true);
    onError?.('');
    const res = await adminFetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId,
        position,
        agencyName: agencyName.trim(),
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    onBusyChange?.(false);
    if (!data.ok) {
      onError?.(data.error ?? 'Could not save profile');
      return;
    }
    setEditing(false);
    onSaved?.();
  }

  if (!editing) {
    return (
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <p className="text-sm text-[#4D4D4D]">
          <span className="font-semibold text-[#1C1C1C]">{initialPosition ?? '—'}</span>
          {' · '}
          {initialAgencyName ?? '—'}
        </p>
        <button
          type="button"
          className="text-sm font-semibold text-[#63A9FA] underline"
          disabled={busy}
          onClick={() => {
            setPosition(
              initialPosition &&
                MEMBER_POSITIONS.includes(
                  initialPosition as (typeof MEMBER_POSITIONS)[number],
                )
                ? initialPosition
                : MEMBER_POSITIONS[0],
            );
            setAgencyName(initialAgencyName ?? '');
            setEditing(true);
          }}
        >
          Edit position & agency
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#E8E6E3] bg-[#F8F7F5] p-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#4D4D4D]">Position</label>
        <select
          className={inputField}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          disabled={busy}
        >
          {MEMBER_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#4D4D4D]">Name of agency</label>
        <input
          className={inputField}
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          disabled={busy}
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryBtn} disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className={secondaryBtn}
          disabled={busy}
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
