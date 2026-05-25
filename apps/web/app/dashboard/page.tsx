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
  const token = await getSessionToken();
  if (token && access.canNominate) {
    const invRes = await workerFetch('/candidates/invitations');
    const invData = (await invRes.json()) as { ok: boolean; invitations?: unknown[] };
    if (invData.ok) {
      pendingInvitations = invData.invitations?.length ?? 0;
    }
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
                : `Zone: ${session.zone}. No pending nominations.`
            }
            href="/candidate"
            accent={pendingInvitations > 0}
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
        </section>
      </main>
    </div>
  );
}
