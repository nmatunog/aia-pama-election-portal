import Link from 'next/link';
import {
  getPhaseAccess,
  PHASE_BANNER_MESSAGES,
  NOMINATE_DISABLED_MESSAGE,
  VOTE_DISABLED_MESSAGE,
} from '@aia-pama/shared';
import { PhaseBanner, Button } from '@aia-pama/ui';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { DashboardTile } from '@/components/dashboard-tile';
import { SiteHeader } from '@/components/site-header';
import { mainWide, pageShell, tileGrid } from '@/lib/layout-classes';

export default async function HomePage() {
  const phase = await getCurrentElectionPhase();
  const access = getPhaseAccess(phase);
  const bannerMessage = PHASE_BANNER_MESSAGES[phase];

  return (
    <div className={pageShell}>
      <SiteHeader
        title="AIA-PAMA Online Election Portal"
        rightLink={{ href: '/login', label: 'Member Login' }}
      />

      <main className={mainWide}>
        <PhaseBanner phase={phase} message={bannerMessage} />

        <section className="mt-6 sm:mt-8 md:mt-10">
          <p className="text-base text-[#4D4D4D] sm:text-lg">
            Secure, transparent elections governed by the AIA-PAMA Election Code.
            Verify your membership, nominate candidates, and cast your official ballot.
          </p>
        </section>

        <section className={`mt-6 sm:mt-8 md:mt-10 ${tileGrid}`}>
          <DashboardTile
            icon="nominate"
            title="Nominate Candidate"
            description="Submit zonal or national Board of Director nominations."
            href="/login?next=/nominate"
            accent={access.primaryAction === 'nominate'}
            enabled={access.canNominate}
            disabledMessage={NOMINATE_DISABLED_MESSAGE}
          />
          <DashboardTile
            icon="vote"
            title="Vote Now"
            description="Cast your official ballot during the voting period."
            href="/login?next=/vote"
            accent={access.primaryAction === 'vote'}
            enabled={access.canVote}
            disabledMessage={VOTE_DISABLED_MESSAGE}
          />
          <DashboardTile
            icon="info"
            title="Election Info"
            description="View candidates, timeline, and certified results."
            href="/candidates"
            enabled
          />
          <DashboardTile
            icon="admin"
            title="ELECOM Admin"
            description="Election committee administration portal."
            href="/admin"
            enabled
          />
        </section>

        <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:mt-10 sm:p-6 md:p-8">
          <h3 className="text-lg font-semibold text-[#1C1C1C]">Need help?</h3>
          <p className="mt-2 text-base text-[#4D4D4D]">
            Contact the Election Committee (ELECOM) for assistance with login,
            nominations, or voting.
          </p>
          <Button variant="help" className="mt-4 min-h-[44px] px-0">
            ELECOM Support
          </Button>
        </section>
      </main>
    </div>
  );
}
