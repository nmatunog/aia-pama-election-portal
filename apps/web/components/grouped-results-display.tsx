import { ZONES } from '@aia-pama/shared';

export type GroupedResultRow = {
  candidateId: string;
  fullName: string;
  type: 'zonal' | 'national';
  zone: string | null;
  voteCount: number;
};

function ResultRowsTable({ rows }: { rows: GroupedResultRow[] }) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm italic text-[#4D4D4D]">No candidates in this group.</p>;
  }

  const sorted = [...rows].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <table className="mt-2 min-w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[#E8E6E3] text-[#4D4D4D]">
          <th className="py-2 pr-4 font-semibold">Candidate</th>
          <th className="py-2 font-semibold text-right">Votes</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.candidateId} className="border-b border-[#E8E6E3] last:border-0">
            <td className="py-2 pr-4 font-semibold text-[#1C1C1C]">{r.fullName}</td>
            <td className="py-2 text-right font-bold text-[#D41245]">{r.voteCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = {
  results: GroupedResultRow[];
  emptyMessage?: string;
};

/** Results grouped by zone (zonal), then National — shared by ELECOM and public pages. */
export function GroupedResultsDisplay({
  results,
  emptyMessage = 'No votes recorded yet.',
}: Props) {
  if (results.length === 0) {
    return <p className="mt-4 text-[#4D4D4D]">{emptyMessage}</p>;
  }

  const zonal = results.filter((r) => r.type === 'zonal');
  const national = results.filter((r) => r.type === 'national');

  const zonalByZone = new Map<string, GroupedResultRow[]>();
  for (const z of ZONES) zonalByZone.set(z, []);
  for (const r of zonal) {
    if (r.zone) {
      const list = zonalByZone.get(r.zone) ?? [];
      list.push(r);
      zonalByZone.set(r.zone, list);
    }
  }

  const hasZonal = zonal.length > 0;
  const hasNational = national.length > 0;

  return (
    <div className="mt-6 space-y-8">
      {hasZonal && (
        <div>
          <h3 className="text-base font-bold text-[#1C1C1C] border-b-2 border-[#D41245] pb-2">
            Zonal — by zone
          </h3>
          <div className="mt-4 space-y-6">
            {ZONES.map((zone) => {
              const rows = zonalByZone.get(zone) ?? [];
              if (rows.length === 0) return null;
              return (
                <div
                  key={zone}
                  className="rounded-lg border border-[#E8E6E3] bg-[#F8F7F5] px-4 py-3"
                >
                  <h4 className="font-semibold text-[#1C1C1C]">{zone}</h4>
                  <ResultRowsTable rows={rows} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasNational && (
        <div>
          <h3 className="text-base font-bold text-[#1C1C1C] border-b-2 border-[#D41245] pb-2">
            National
          </h3>
          <div className="mt-4 rounded-lg border border-[#E8E6E3] bg-[#F8F7F5] px-4 py-3">
            <ResultRowsTable rows={national} />
          </div>
        </div>
      )}
    </div>
  );
}
