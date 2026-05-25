import Link from 'next/link';
import { Suspense } from 'react';
import { PamaLogo } from '@/components/pama-logo';
import { card, navLink, pageLead, pageShell, pageTitle } from '@/lib/layout-classes';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className={`${pageShell} flex flex-col`}>
      <header className="border-b border-[#E8E6E3] bg-white safe-top">
        <div className="mx-auto flex w-full max-w-md items-center px-4 py-3 sm:px-6 sm:py-4 md:max-w-lg">
          <Link href="/" className={navLink}>
            ← Back
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-6 safe-bottom sm:px-6 sm:py-10">
        <div className={`${card} max-w-md md:max-w-lg`}>
          <PamaLogo context="hero" className="mx-auto mb-4 block sm:mb-6" priority />
          <h1 className={pageTitle}>Election Login</h1>
          <p className={pageLead}>
            Step 1: Verify your membership. Step 2: Enter your one-time password and
            click Verify &amp; Sign In.
          </p>
          <Suspense fallback={<p className="mt-8 text-[#4D4D4D]">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
