'use client';

import { FormattedDateTime } from '@/components/formatted-datetime';

export type AdminNominationRow = {
  nominationId: string;
  type: 'zonal' | 'national';
  createdAt: string;
  nominatorName: string;
  candidateName: string;
  candidateZone: string;
  candidateStatus: string;
  endorserCount: number;
  candidateId: string;
};

type Props = {
  nominations: AdminNominationRow[];
};

export function ElecomNominationsTable({ nominations }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-[#E8E6E3] bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#E8E6E3] bg-[#F8F7F5]">
          <tr>
            <th className="px-4 py-3 font-semibold">Candidate</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Nominator</th>
            <th className="px-4 py-3 font-semibold">Endorsers</th>
            <th className="px-4 py-3 font-semibold">Nomination status</th>
            <th className="px-4 py-3 font-semibold">Filed</th>
          </tr>
        </thead>
        <tbody>
          {nominations.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-[#4D4D4D]">
                No nominations on record.
              </td>
            </tr>
          ) : (
            nominations.map((n) => (
              <tr key={n.nominationId} className="border-b border-[#E8E6E3] last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold">{n.candidateName}</p>
                  <p className="text-xs text-[#4D4D4D]">{n.candidateZone}</p>
                </td>
                <td className="px-4 py-3 capitalize">{n.type}</td>
                <td className="px-4 py-3">{n.nominatorName}</td>
                <td className="px-4 py-3">{n.endorserCount}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-[#F8F7F5] px-2 py-0.5 text-xs font-medium">
                    {n.candidateStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#4D4D4D]">
                  <FormattedDateTime iso={n.createdAt} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
