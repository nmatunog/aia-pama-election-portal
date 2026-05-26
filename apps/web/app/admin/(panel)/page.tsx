import Link from 'next/link';
import { PHASE_LABELS } from '@aia-pama/shared';
import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import { ElecomElectionAdminPanel } from '@/components/elecom-election-admin-panel';
import { ElecomCertifyPanel } from '@/components/elecom-certify-panel';
import { ElecomPhaseControl } from '@/components/elecom-phase-control';
import {
  ElecomResultsTable,
  type ElecomResultRow,
} from '@/components/elecom-results-table';
import {
  CertifiedResultsAnnouncement,
  type CertifiedAnnouncementData,
} from '@/components/certified-results-announcement';
import { ElecomReviewQueue, type PendingCandidate } from './elecom-review-queue';

type OverviewResponse = {
  ok: boolean;
  election?: {
    id: string;
    cycle_year: number;
    phase: string;
    nomination_closes_at: string | null;
    voting_closes_at: string | null;
    certified_at?: string | null;
  };
  candidateCounts?: Record<string, number>;
  pendingApproval?: PendingCandidate[];
  voterStats?: { total: number; eligible: number; voted: number };
  nominationCount?: number;
  results?: ElecomResultRow[];
  showResults?: boolean;
  certified?: CertifiedAnnouncementData;
  error?: string;
};

export default async function ElecomAdminPage() {
  const res = await adminWorkerFetch('/admin/overview');
  const data = (await res.json()) as OverviewResponse;

  if (!data.ok || !data.election) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#D41245]">{data.error ?? 'Could not load election overview.'}</p>
        <p className="mt-2 text-sm text-[#4D4D4D]">Ensure npm run dev:api is running.</p>
      </div>
    );
  }

  const phaseLabel =
    PHASE_LABELS[data.election.phase as keyof typeof PHASE_LABELS] ?? data.election.phase;
  const counts = data.candidateCounts ?? {};
  const voters = data.voterStats ?? { total: 0, eligible: 0, voted: 0 };

  const certifiedPreview: CertifiedAnnouncementData | null =
    data.election.phase === 'certified' && data.certified
      ? {
          ...data.certified,
          ok: true,
          election: data.election,
          turnout: voters.voted,
          certifiedAt: data.election.certified_at ?? data.certified.certifiedAt,
        }
      : null;

  return (
    <>
      <h2 className={pageTitle}>{data.election.cycle_year} Election Overview</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        Current phase: <span className="font-semibold text-[#1C1C1C]">{phaseLabel}</span>
      </p>

      <ElecomElectionAdminPanel
        electionId={data.election.id}
        cycleYear={data.election.cycle_year}
        phase={data.election.phase}
      />

      <ElecomCertifyPanel
        electionId={data.election.id}
        cycleYear={data.election.cycle_year}
        phase={data.election.phase}
        certifiedAt={data.election.certified_at ?? null}
        turnout={voters.voted}
        canCertify={data.election.phase === 'canvassing'}
      />

      <ElecomPhaseControl
        electionId={data.election.id}
        currentPhase={data.election.phase}
        disabled={data.election.phase === 'certified'}
      />

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          ['pending_acceptance', 'Awaiting nominee'],
          ['pending_approval', 'Awaiting ELECOM'],
          ['approved', 'Approved'],
          ['rejected', 'Rejected'],
          ['declined', 'Declined'],
        ].map(([key, label]) => (
          <div
            key={key}
            className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-center"
          >
            <p className="text-2xl font-bold text-[#D41245]">{counts[key] ?? 0}</p>
            <p className="mt-1 text-xs text-[#4D4D4D]">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3">
          <p className="text-2xl font-bold text-[#D41245]">{data.nominationCount ?? 0}</p>
          <p className="text-sm text-[#4D4D4D]">
            <Link href="/admin/nominations" className="font-semibold text-[#63A9FA] underline">
              Nominations filed
            </Link>
          </p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3">
          <p className="text-2xl font-bold text-[#D41245]">{voters.eligible}</p>
          <p className="text-sm text-[#4D4D4D]">
            <Link href="/admin/voters" className="font-semibold text-[#63A9FA] underline">
              Member roster
            </Link>
          </p>
        </div>
        <div className="rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3">
          <p className="text-2xl font-bold text-[#D41245]">{voters.voted}</p>
          <p className="text-sm text-[#4D4D4D]">Ballots cast (when voting opens)</p>
        </div>
      </section>

      <ElecomResultsTable
        phase={data.election.phase}
        turnout={voters.voted}
        results={data.results ?? []}
      />

      {certifiedPreview && data.certified && data.election.phase === 'certified' && (
        <CertifiedResultsAnnouncement data={certifiedPreview} />
      )}

      <ElecomReviewQueue
        electionId={data.election.id}
        initial={data.pendingApproval ?? []}
      />
    </>
  );
}
