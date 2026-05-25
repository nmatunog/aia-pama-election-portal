import type { CandidateInvitation } from './candidate-invitations';

const STATUS_LABELS: Record<string, string> = {
  pending_acceptance: 'Action required — accept or decline',
  pending_approval: 'You accepted — pending ELECOM approval',
  declined: 'You declined this nomination',
  approved: 'Approved by ELECOM',
  rejected: 'Not approved by ELECOM',
};

export function CandidateStatus({ candidacies }: { candidacies: CandidateInvitation[] }) {
  if (candidacies.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#1C1C1C]">Your candidacies this election</h2>
      <p className="mt-1 text-sm text-[#4D4D4D]">
        All nominations where you are the candidate, including ones you already responded to.
      </p>
      <ul className="mt-4 divide-y divide-[#E8E6E3]">
        {candidacies.map((c) => {
          const statusLabel = STATUS_LABELS[c.status] ?? c.status;
          const needsAction = c.status === 'pending_acceptance';
          return (
            <li key={c.candidateId} className="py-4 first:pt-0 last:pb-0">
              <p className="font-semibold capitalize text-[#1C1C1C]">
                {c.type} Board of Directors
                {c.type === 'zonal' && c.zone ? ` · ${c.zone}` : ''}
              </p>
              <p className="mt-1 text-sm text-[#4D4D4D]">
                Nominated by <span className="font-semibold text-[#1C1C1C]">{c.nominatorName}</span>
              </p>
              <p
                className={`mt-2 text-sm font-medium ${
                  needsAction ? 'text-[#D41245]' : 'text-[#4D4D4D]'
                }`}
              >
                {statusLabel}
              </p>
              <p className="mt-1 text-xs text-[#4D4D4D]">
                Received {new Date(c.nominatedAt).toLocaleString()}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
