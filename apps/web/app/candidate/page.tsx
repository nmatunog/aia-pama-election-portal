import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPhaseAccess } from '@aia-pama/shared';
import { AppHeader } from '@/components/app-header';
import { PamaLogo } from '@/components/pama-logo';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { getSession } from '@/lib/session';
import { getSessionToken, workerFetch } from '@/lib/worker-api';
import { mainNarrow, pageLead, pageShell, pageTitle } from '@/lib/layout-classes';
import { CandidateInvitations, type CandidateInvitation } from './candidate-invitations';

type InvitationsResponse = {
  ok: boolean;
  electionId?: string;
  invitations?: CandidateInvitation[];
  error?: string;
};

export default async function CandidatePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/candidate');

  const phase = await getCurrentElectionPhase();
  const access = getPhaseAccess(phase);

  const token = await getSessionToken();
  if (!token) redirect('/login?next=/candidate');

  const res = await workerFetch('/candidates/invitations');
  const data = (await res.json()) as InvitationsResponse;
  const invitations = data.ok ? (data.invitations ?? []) : [];
  const electionId = data.electionId ?? '';

  return (
    <div className={pageShell}>
      <AppHeader variant="narrow" backHref="/dashboard" backLabel="← Dashboard" />
      <main className={`${mainNarrow} safe-bottom`}>
        <PamaLogo context="hero" className="mx-auto mb-4 block sm:mb-6" priority />
        <h1 className={pageTitle}>Nomination invitations</h1>
        <p className={pageLead}>
          Review nominations where you are the candidate. Accept to proceed to ELECOM approval,
          or decline if you do not wish to run.
        </p>

        <p className="mt-4 text-sm text-[#4D4D4D]">
          Signed in as <span className="font-semibold text-[#1C1C1C]">{session.fullName}</span> ·{' '}
          {session.zone}
        </p>

        {!access.canNominate ? (
          <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
            <p className="text-base text-[#4D4D4D]">
              The nomination period is not open. Invitations can only be answered during the
              nomination phase.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block min-h-[44px] text-[#63A9FA] underline"
            >
              Back to Dashboard
            </Link>
          </section>
        ) : !data.ok ? (
          <p className="mt-6 rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
            {data.error ?? 'Could not load invitations. Ensure npm run dev:api is running.'}
          </p>
        ) : (
          <CandidateInvitations electionId={electionId} invitations={invitations} />
        )}
      </main>
    </div>
  );
}
