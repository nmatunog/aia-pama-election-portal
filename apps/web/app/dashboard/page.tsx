import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { DashboardTile } from '@/components/dashboard-tile';
import { SignOutLink } from '@/components/sign-out-link';
import {
  getPhaseAccess,
  PHASE_BANNER_MESSAGES,
  NOMINATE_DISABLED_MESSAGE,
  VOTE_DISABLED_MESSAGE,
} from '@aia-pama/shared';
import { PhaseBanner } from '@aia-pama/ui';
import {
  CertifiedResultsAnnouncement,
  type CertifiedAnnouncementData,
} from '@/components/certified-results-announcement';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { getSession } from '@/lib/session';
import { getSessionToken, workerFetch } from '@/lib/worker-api';
import { mainWide, pageShell, tileGrid } from '@/lib/layout-classes';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const phase = await getCurrentElectionPhase();
  const access = getPhaseAccess(phase);
  const bannerMessage = PHASE_BANNER_MESSAGES[phase];

  let pendingInvitations = 0;
  let candidacySummary = '';
  let certifiedAnnouncement: CertifiedAnnouncementData | null = null;
  const token = await getSessionToken();
  if (token && access.canNominate) {
    const invRes = await workerFetch('/candidates/mine');
    const invData = (await invRes.json()) as {
      ok: boolean;
      pendingCount?: number;
      candidacies?: Array<{ status: string; type: string; nominatorName: string }>;
    };
    if (invData.ok) {
      pendingInvitations = invData.pendingCount ?? 0;
      const responded = (invData.candidacies ?? []).filter(
        (c) => c.status !== 'pending_acceptance',
      );
      if (pendingInvitations === 0 && responded.length > 0) {
        const latest = responded[0];
        const statusNote =
          latest.status === 'pending_approval'
            ? 'Accepted — pending ELECOM approval'
            : latest.status === 'declined'
              ? 'You declined a nomination'
              : latest.status;
        candidacySummary = `${responded.length} nomination(s) on file · ${statusNote}`;
      }
    }
  }

  if (phase === 'certified') {
    const certRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'}/elections/certified-announcement`,
      { cache: 'no-store' },
    );
    certifiedAnnouncement = (await certRes.json()) as CertifiedAnnouncementData;
  }

  return (
    <div className={pageShell}>
      <AppHeader
        showLogo
        title="Member Dashboard"
        subtitle={`${session.fullName} · ${session.zone}`}
        right={<SignOutLink />}
      />

      <main className={mainWide}>
        <PhaseBanner phase={phase} message={bannerMessage} />

        {certifiedAnnouncement && (
          <CertifiedResultsAnnouncement data={certifiedAnnouncement} />
        )}

        <section className={`mt-6 sm:mt-8 md:mt-10 ${tileGrid}`}>
          <DashboardTile
            icon="vote"
            title="Vote Now"
            description="Cast your official ballot during the voting period."
            href="/vote"
            accent={access.primaryAction === 'vote'}
            enabled={access.canVote}
            disabledMessage={VOTE_DISABLED_MESSAGE}
          />
          <DashboardTile
            icon="nominate"
            title="Nominate Candidate"
            description="Submit zonal or national Board of Director nominations."
            href="/nominate"
            accent={access.primaryAction === 'nominate'}
            enabled={access.canNominate}
            disabledMessage={NOMINATE_DISABLED_MESSAGE}
          />
          <DashboardTile
            icon="profile"
            title="Nomination invitations"
            description={
              pendingInvitations > 0
                ? `${pendingInvitations} pending — accept or decline nominations for you.`
                : candidacySummary ||
                  `Zone: ${session.zone}. View nominations where you are the candidate.`
            }
            href="/candidate"
            accent={pendingInvitations > 0 || candidacySummary.length > 0}
            enabled={access.canNominate}
            disabledMessage="Available during the nomination period when you are nominated."
          />
          <DashboardTile
            icon="info"
            title="Election Info"
            description="View candidates, timeline, and certified results."
            href="/candidates"
            enabled
          />
          {session.isElecom && (
            <DashboardTile
              icon="admin"
              title="ELECOM Administration"
              description="Review candidates, approve nominees, and monitor election status."
              href="/admin"
              accent
              enabled
            />
          )}
        </section>
      </main>
    </div>
  );
}
