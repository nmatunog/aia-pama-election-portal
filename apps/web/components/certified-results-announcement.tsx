import Link from 'next/link';
import { ZONES } from '@aia-pama/shared';
import { formatDateTimeLong } from '@/lib/format-datetime';
import type { CertifiedElectionResults } from '@aia-pama/shared';

export type CertifiedAnnouncementData = {
  ok: boolean;
  election?: { id: string; cycle_year: number; phase: string };
  turnout?: number;
  certifiedAt?: string;
  error?: string;
} & Partial<CertifiedElectionResults>;

type Props = {
  data: CertifiedAnnouncementData;
};

export function CertifiedResultsAnnouncement({ data }: Props) {
  if (!data.ok || !data.election) {
    return (
      <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <p className="text-sm text-[#4D4D4D]">
          {data.error ?? 'Certified results are not yet available.'}
        </p>
      </section>
    );
  }

  const zonalWinners = data.zonalWinners ?? [];
  const nationalSeated = (data.nationalBoard ?? []).filter((s) => s.seated);
  const displaced = data.displacedFromNational ?? [];

  const certifiedDate = data.certifiedAt
    ? formatDateTimeLong(data.certifiedAt)
    : null;

  return (
    <section
      className="mt-8 rounded-xl border-2 border-[#1A7A3A] bg-[#F8F7F5] p-5 sm:p-8"
      aria-labelledby="certified-announcement-title"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#1A7A3A]">
        Official announcement
      </p>
      <h2
        id="certified-announcement-title"
        className="mt-2 text-xl font-bold text-[#1C1C1C] sm:text-2xl"
      >
        {data.election.cycle_year} Board of Directors Election — Certified Results
      </h2>
      <p className="mt-3 text-base leading-relaxed text-[#4D4D4D]">
        The Election Committee (ELECOM) has certified the results of the{' '}
        {data.election.cycle_year} AIA-PAMA online election
        {certifiedDate ? ` on ${certifiedDate}` : ''}.{' '}
        <span className="font-semibold text-[#1C1C1C]">{data.turnout ?? 0}</span> members
        cast ballots. Zonal directors are the leading vote-getter in each zone. National
        directors are the top five national vote-getters who were not elected in their zone;
        a member who wins a zonal seat is not seated on the national board.
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <h3 className="text-lg font-bold text-[#1C1C1C] border-b-2 border-[#D41245] pb-2">
            Zonal directors (by zone)
          </h3>
          <ul className="mt-4 space-y-3">
            {ZONES.map((zone) => {
              const winner = zonalWinners.find((w) => w.zone === zone);
              return (
                <li
                  key={zone}
                  className="rounded-lg border border-[#E8E6E3] bg-white px-4 py-3"
                >
                  <span className="font-semibold text-[#1C1C1C]">{zone}</span>
                  {winner ? (
                    <span className="mt-1 block text-[#4D4D4D]">
                      <span className="font-semibold text-[#D41245]">{winner.fullName}</span>
                      {' — '}
                      {winner.voteCount} vote{winner.voteCount === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="mt-1 block italic text-[#4D4D4D]">No certified winner</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#1C1C1C] border-b-2 border-[#D41245] pb-2">
            National board of directors (5 seats)
          </h3>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[#4D4D4D]">
            {nationalSeated.map((seat) => (
              <li key={seat.candidateId}>
                <span className="font-semibold text-[#1C1C1C]">{seat.fullName}</span>
                {' — '}
                {seat.voteCount} national vote{seat.voteCount === 1 ? '' : 's'}
              </li>
            ))}
          </ol>
          {nationalSeated.length === 0 && (
            <p className="mt-3 italic text-[#4D4D4D]">No national seats certified.</p>
          )}
        </div>

        {displaced.length > 0 && (
          <div className="rounded-lg border border-[#E8E6E3] bg-white px-4 py-3">
            <h4 className="text-sm font-semibold text-[#1C1C1C]">National precedence note</h4>
            <ul className="mt-2 space-y-2 text-sm text-[#4D4D4D]">
              {displaced.map((d) => (
                <li key={d.memberId}>
                  <span className="font-semibold">{d.fullName}</span> received{' '}
                  {d.nationalVoteCount} national vote
                  {d.nationalVoteCount === 1 ? '' : 's'} but was elected zonal director for{' '}
                  {d.zonalZone}; the next-ranked national candidates fill national seats.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-[#4D4D4D]">
        Full vote totals:{' '}
        <Link href="/candidates" className="font-semibold text-[#63A9FA] underline">
          Election information
        </Link>
      </p>
    </section>
  );
}
