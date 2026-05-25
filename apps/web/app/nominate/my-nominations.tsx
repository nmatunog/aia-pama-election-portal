type NominationRow = {
  id: string;
  type: 'zonal' | 'national';
  created_at: string;
  candidates: {
    id: string;
    status: string;
    members: { full_name: string; zone: string };
  };
};

const STATUS_LABELS: Record<string, string> = {
  pending_acceptance: 'Awaiting candidate acceptance',
  declined: 'Declined by candidate',
  pending_approval: 'Pending ELECOM approval',
  approved: 'Approved',
  rejected: 'Rejected by ELECOM',
};

export function MyNominations({ nominations }: { nominations: NominationRow[] }) {
  if (nominations.length === 0) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:mt-10 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1C1C1C]">My nominations</h2>
        <p className="mt-2 text-base text-[#4D4D4D]">
          You have not submitted any nominations yet for this election.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-xl border-2 border-[#E8E6E3] bg-white p-6">
      <h2 className="text-lg font-semibold text-[#1C1C1C]">My nominations</h2>
      <ul className="mt-4 divide-y divide-[#E8E6E3]">
        {nominations.map((n) => {
          const candidate = n.candidates?.members;
          const statusLabel = STATUS_LABELS[n.candidates?.status] ?? n.candidates?.status;
          return (
            <li key={n.id} className="py-4 first:pt-0 last:pb-0">
              <p className="font-semibold capitalize text-[#1C1C1C]">
                {n.type} — {candidate?.full_name ?? 'Unknown'}
              </p>
              <p className="mt-1 text-sm text-[#4D4D4D]">
                {candidate?.zone} · {statusLabel}
              </p>
              <p className="mt-1 text-xs text-[#4D4D4D]">
                Submitted {new Date(n.created_at).toLocaleString()}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
