import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PamaLogo } from '@/components/pama-logo';
import { getElecomSession } from '@/lib/admin-session';
import { card, navLink, pageLead, pageShell, pageTitle } from '@/lib/layout-classes';
import { ElecomLoginForm } from './elecom-login-form';

export default async function ElecomLoginPage() {
  const session = await getElecomSession();
  if (session) redirect('/admin');

  return (
    <div className={`${pageShell} flex flex-col`}>
      <header className="border-b border-[#E8E6E3] bg-white safe-top">
        <div className="mx-auto flex w-full max-w-md items-center px-4 py-3 sm:px-6">
          <Link href="/" className={navLink}>
            ← Home
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-8 safe-bottom">
        <div className={`${card} w-full max-w-md`}>
          <PamaLogo context="hero" className="mx-auto mb-4 block" priority />
          <h1 className={pageTitle}>ELECOM Admin</h1>
          <p className={pageLead}>
            Election Committee sign-in to review candidates, monitor phases, and manage
            the election.
          </p>
          <ElecomLoginForm />
          <p className="mt-6 text-sm text-[#4D4D4D]">
            Members use{' '}
            <Link href="/login" className="font-semibold text-[#63A9FA] underline">
              Member Login
            </Link>{' '}
            with an AIA license code.
          </p>
        </div>
      </div>
    </div>
  );
}
