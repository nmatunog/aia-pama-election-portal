'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { primaryBtn, secondaryBtn } from '@/lib/layout-classes';

type Props = {
  electionId: string;
  cycleYear: number;
  phase: string;
};

export function ElecomElectionAdminPanel({ electionId, cycleYear, phase }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newYear, setNewYear] = useState(String(cycleYear + 1));

  async function resetCurrent() {
    if (!window.confirm('Clear all ballots, nominations, and candidates for the current election?')) {
      return;
    }
    setBusy('reset');
    setError(null);
    const res = await fetch('/api/admin/election/reset-current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setBusy(null);
    if (!data.ok) {
      setError(data.error ?? 'Reset failed');
      return;
    }
    setMessage(data.message ?? 'Election reset.');
    router.refresh();
  }

  async function newCycle(force = false) {
    const label = force ? 'FORCE start' : 'Start';
    if (
      !window.confirm(
        `${label} a new election cycle (${newYear})? The current cycle will be archived as failed.`,
      )
    ) {
      return;
    }
    setBusy('new');
    setError(null);
    const res = await fetch('/api/admin/election/new-cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirm: true,
        cycleYear: Number(newYear),
        force,
      }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setBusy(null);
    if (!data.ok) {
      setError(data.error ?? 'Could not start new cycle');
      return;
    }
    setMessage(data.message ?? 'New cycle started.');
    router.refresh();
  }

  async function importDevRoster() {
    if (
      !window.confirm(
        'Import the standard dev roster (~90 members, 15 per zone)? Existing members are merged by license code.',
      )
    ) {
      return;
    }
    setBusy('import');
    setError(null);
    const res = await fetch('/api/admin/members/import-dev-template?perZone=15', {
      method: 'POST',
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setBusy(null);
    if (!data.ok) {
      setError(data.error ?? 'Import failed');
      return;
    }
    setMessage(data.message ?? 'Roster imported.');
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-xl border-2 border-[#63A9FA] bg-[#F8F7F5] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#63A9FA]">
        Election & roster administration
      </p>
      <p className="mt-2 text-sm text-[#4D4D4D]">
        Current cycle: <strong>{cycleYear}</strong> · phase <strong>{phase}</strong>
      </p>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap">
        <div className="min-w-[12rem] flex-1 rounded-lg border border-[#E8E6E3] bg-white p-4">
          <h4 className="font-semibold text-[#1C1C1C]">Reset current election</h4>
          <p className="mt-1 text-xs text-[#4D4D4D]">
            Clears ballots and candidacies; stays on same election row; phase → nomination.
          </p>
          <button
            type="button"
            className={`${secondaryBtn} mt-3`}
            disabled={!!busy}
            onClick={resetCurrent}
          >
            {busy === 'reset' ? 'Working…' : 'Reset election data'}
          </button>
        </div>

        <div className="min-w-[12rem] flex-1 rounded-lg border border-[#E8E6E3] bg-white p-4">
          <h4 className="font-semibold text-[#1C1C1C]">Start new election cycle</h4>
          <p className="mt-1 text-xs text-[#4D4D4D]">
            After certified/failed (or force). Creates a new election record.
          </p>
          <label className="mt-2 block text-sm">
            Cycle year
            <input
              type="number"
              className="mt-1 w-full rounded-lg border-2 border-[#E8E6E3] px-3 py-2"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={!!busy}
              onClick={() => newCycle(false)}
            >
              {busy === 'new' ? 'Working…' : 'Start new cycle'}
            </button>
            <button
              type="button"
              className={secondaryBtn}
              disabled={!!busy}
              onClick={() => newCycle(true)}
            >
              Force start
            </button>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 rounded-lg border border-[#E8E6E3] bg-white p-4">
          <h4 className="font-semibold text-[#1C1C1C]">Import voter roster</h4>
          <p className="mt-1 text-xs text-[#4D4D4D]">
            Re-seed current-year template (dev). Production: use CSV import API later.
          </p>
          <button
            type="button"
            className={`${secondaryBtn} mt-3`}
            disabled={!!busy}
            onClick={importDevRoster}
          >
            {busy === 'import' ? 'Importing…' : 'Import dev roster (90)'}
          </button>
        </div>
      </div>

      <input type="hidden" value={electionId} readOnly aria-hidden />

      {message && (
        <p className="mt-4 text-sm font-medium text-[#1A7A3A]">{message}</p>
      )}
      {error && (
        <p className="mt-4 text-sm font-medium text-[#D41245]">{error}</p>
      )}
    </section>
  );
}
