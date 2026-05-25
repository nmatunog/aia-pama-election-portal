import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPhaseAccess } from '@aia-pama/shared';
import { AppHeader } from '@/components/app-header';
import { PamaLogo } from '@/components/pama-logo';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { getSession } from '@/lib/session';
import { getSessionToken, workerFetch } from '@/lib/worker-api';
import type { NominationLimits } from '@/lib/api';
import { mainNarrow, pageLead, pageShell, pageTitle } from '@/lib/layout-classes';
import { MyNominations } from './my-nominations';
import { NominateWizard } from './nominate-wizard';

type MyNominationsResponse = {
  ok: boolean;
  nominations?: Array<{
    id: string;
    type: 'zonal' | 'national';
    created_at: string;
    candidates: {
      id: string;
      status: string;
      members: { full_name: string; zone: string };
    };
  }>;
};

export default async function NominatePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/nominate');

  const phase = await getCurrentElectionPhase();
  const access = getPhaseAccess(phase);
  if (!access.canNominate) {
    redirect('/dashboard');
  }

  const token = await getSessionToken();
  if (!token) redirect('/login?next=/nominate');

  const [electionRes, limitsRes, mineRes] = await Promise.all([
    workerFetch('/elections/current'),
    workerFetch('/nominations/limits'),
    workerFetch('/nominations/mine'),
  ]);

  const electionData = (await electionRes.json()) as {
    ok: boolean;
    election?: { id: string };
    error?: string;
  };
  const limits = (await limitsRes.json()) as NominationLimits;
  const mineData = (await mineRes.json()) as MyNominationsResponse;
  const myNominations = mineData.ok ? (mineData.nominations ?? []) : [];

  if (!electionData.ok || !electionData.election?.id) {
    return (
      <div className={`${pageShell} px-4 py-16 text-center safe-bottom sm:px-6`}>
        <p className="text-base text-[#D41245] sm:text-lg">
          {electionData.error ?? 'No active election. Run: npm run seed:election'}
        </p>
        <Link href="/dashboard" className="mt-4 inline-block min-h-[44px] text-[#63A9FA] underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const electionId = electionData.election.id;

  return (
    <div className={pageShell}>
      <AppHeader variant="narrow" backHref="/dashboard" backLabel="← Dashboard" />
      <main className={`${mainNarrow} safe-bottom`}>
        <PamaLogo context="hero" className="mx-auto mb-4 block sm:mb-6" priority />
        <h1 className={pageTitle}>Nominate Candidate</h1>
        <p className={pageLead}>
          Nominate a Board of Director candidate for the {new Date().getFullYear()} election.
        </p>

        {limits.ok ? (
          <NominateWizard
            electionId={electionId}
            memberId={session.id}
            memberName={session.fullName}
            memberZone={session.zone}
            limits={{ ...limits, electionId }}
          />
        ) : (
          <p className="mt-8 rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
            {limits.error ?? 'Could not load limits. Ensure npm run dev:api is running.'}
          </p>
        )}

        <MyNominations nominations={myNominations} />
      </main>
    </div>
  );
}
