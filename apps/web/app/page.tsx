import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PHASE_BANNER_MESSAGES } from '@aia-pama/shared';
import { PhaseBanner } from '@aia-pama/ui';
import { LandingPathCard } from '@/components/landing-path-card';
import { SiteHeader } from '@/components/site-header';
import { getCurrentElectionPhase } from '@/lib/election-status';
import { getSession } from '@/lib/session';
import { mainWide, pageShell } from '@/lib/layout-classes';

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const phase = await getCurrentElectionPhase();
  const bannerMessage =
    PHASE_BANNER_MESSAGES[phase] ?? PHASE_BANNER_MESSAGES.nomination;

  return (
    <div className={pageShell}>
      <SiteHeader title="AIA-PAMA Online Election Portal" />

      <main className={mainWide}>
        <PhaseBanner phase={phase} message={bannerMessage} />

        <section className="mt-6 text-center sm:mt-8 md:mt-10">
          <h2 className="text-xl font-bold text-[#1C1C1C] sm:text-2xl md:text-3xl">
            Welcome to the election portal
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#4D4D4D] sm:text-lg">
            Secure, transparent elections governed by the AIA-PAMA Election Code.
            Choose how you would like to get started.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-2 md:gap-6 lg:gap-8">
          <LandingPathCard
            icon="register"
            title="Register"
            description="New members: apply for roster membership. Sign-up is always open; ELECOM reviews and approves applications before you can sign in."
            ctaLabel="Start registration"
            href="/register"
          />
          <LandingPathCard
            icon="signin"
            title="Sign in"
            description="Approved members: verify your license and one-time password to access member tools."
            ctaLabel="Sign in to continue"
            href="/login?next=/dashboard"
            accent
            features={[
              'Nominate candidates for Board of Director seats',
              'Cast your official ballot during voting',
              'View election info, candidates, and certified results',
            ]}
            footerLink={{
              href: '/candidates',
              label: 'View public election info without signing in',
            }}
          />
        </section>

        <section className="mt-8 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:mt-10 sm:p-6 md:p-8">
          <h3 className="text-lg font-semibold text-[#1C1C1C]">Need help?</h3>
          <p className="mt-2 text-base text-[#4D4D4D]">
            Contact the Election Committee (ELECOM) for assistance with registration,
            login, nominations, or voting.
          </p>
          <p className="mt-4 text-sm text-[#4D4D4D]">
            ELECOM administrators:{' '}
            <Link href="/admin/login" className="font-semibold text-[#63A9FA] underline">
              Admin sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
