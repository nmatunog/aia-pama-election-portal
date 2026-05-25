'use client';

import { PHASE_LABELS, type ElectionPhase } from '@aia-pama/shared';

/** Certified is set only via the Certify button, not the dropdown. */
const MANUAL_PHASES = [
  'draft',
  'nomination',
  'voting',
  'canvassing',
  'failed',
] as const;
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { primaryBtn } from '@/lib/layout-classes';

type Props = {
  electionId: string;
  currentPhase: string;
  disabled?: boolean;
};

export function ElecomPhaseControl({ electionId, currentPhase, disabled }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState(currentPhase);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch('/api/admin/election/phase', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId, phase }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? 'Could not update phase');
      return;
    }
    setMessage('Election phase updated.');
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold text-[#1C1C1C]">Election phase control</h3>
      <p className="mt-1 text-sm text-[#4D4D4D]">
        Advance or roll back the election lifecycle (except certification — use Certify at the top).
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#1C1C1C]">
          Phase
          <select
            className="min-w-[12rem] rounded-lg border-2 border-[#E8E6E3] bg-[#F8F7F5] px-3 py-2 text-base"
            value={phase}
            disabled={disabled}
            onChange={(e) => setPhase(e.target.value)}
          >
            {MANUAL_PHASES.map((p) => (
              <option key={p} value={p}>
                {PHASE_LABELS[p as ElectionPhase]}
              </option>
            ))}
            {currentPhase === 'certified' && (
              <option value="certified">{PHASE_LABELS.certified}</option>
            )}
          </select>
        </label>
        <button type="button" className={primaryBtn} disabled={busy || disabled} onClick={save}>
          {busy ? 'Saving…' : 'Update phase'}
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-medium text-[#1A7A3A]">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-[#D41245]">{error}</p>}
    </section>
  );
}
