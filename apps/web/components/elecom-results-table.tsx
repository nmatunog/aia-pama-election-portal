'use client';

import {
  GroupedResultsDisplay,
  type GroupedResultRow,
} from '@/components/grouped-results-display';

export type ElecomResultRow = GroupedResultRow;

type Props = {
  phase: string;
  turnout: number;
  results: ElecomResultRow[];
};

export function ElecomResultsTable({ phase, turnout, results }: Props) {
  const show =
    phase === 'canvassing' || phase === 'certified' || phase === 'voting';

  if (!show) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1C1C1C]">Vote results</h2>
        <p className="mt-2 text-sm text-[#4D4D4D]">
          Results appear here during voting, canvassing, and after certification. Set the
          phase to <strong>Canvassing</strong> or <strong>Certified</strong> once voting
          closes.
        </p>
      </section>
    );
  }

  const title =
    phase === 'certified'
      ? 'Certified results'
      : phase === 'canvassing'
        ? 'Canvassing results'
        : 'Live vote totals (voting in progress)';

  return (
    <section
      id="results"
      className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6 scroll-mt-24"
    >
      <h2 className="text-lg font-semibold text-[#1C1C1C]">{title}</h2>
      <p className="mt-2 text-sm text-[#4D4D4D]">
        <span className="font-semibold text-[#1C1C1C]">{turnout}</span> ballots cast.
        Totals are grouped by zone, then national directors.
      </p>

      <GroupedResultsDisplay results={results} />

      <p className="mt-6 text-xs text-[#4D4D4D]">
        Public portal:{' '}
        <a
          href="/candidates"
          className="font-semibold text-[#63A9FA] underline"
          target="_blank"
          rel="noreferrer"
        >
          /candidates
        </a>{' '}
        (same grouping when phase is canvassing or certified).
      </p>
    </section>
  );
}
