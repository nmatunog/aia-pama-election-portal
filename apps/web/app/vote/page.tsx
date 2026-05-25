import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPhaseAccess } from '@aia-pama/shared';
import { AppHeader } from '@/components/app-header';
import { PamaLogo } from '@/components/pama-logo';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { getSession } from '@/lib/session';
import { getSessionToken, workerFetch } from '@/lib/worker-api';
import { mainNarrow, pageLead, pageShell, pageTitle } from '@/lib/layout-classes';
import { VoteBallotWizard, type BallotOptionsData } from './vote-ballot-wizard';

export default async function VotePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/vote');

  const phase = await getCurrentElectionPhase();
  const access = getPhaseAccess(phase);
  if (!access.canVote) {
    redirect('/dashboard');
  }

  const token = await getSessionToken();
  if (!token) redirect('/login?next=/vote');

  const res = await workerFetch('/ballots/options');
  const data = (await res.json()) as BallotOptionsData & { ok: boolean; error?: string };

  if (!data.ok) {
    return (
      <div className={`${pageShell} px-4 py-16 text-center safe-bottom`}>
        <p className="text-[#D41245]">{data.error ?? 'Could not load ballot.'}</p>
        <p className="mt-2 text-sm text-[#4D4D4D]">Ensure npm run dev:api is running.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-[#63A9FA] underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={pageShell}>
      <AppHeader variant="narrow" backHref="/dashboard" backLabel="← Dashboard" />
      <main className={`${mainNarrow} safe-bottom`}>
        <PamaLogo context="hero" className="mx-auto mb-4 block sm:mb-6" priority />
        <h1 className={pageTitle}>Cast Your Ballot</h1>
        <p className={pageLead}>
          Select one zonal Board of Director and up to five national directors. Your
          choices are secret; only participation is recorded.
        </p>

        <VoteBallotWizard
          electionId={data.electionId}
          memberZone={session.zone}
          options={data}
        />
      </main>
    </div>
  );
}
