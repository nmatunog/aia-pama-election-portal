import Link from 'next/link';
import { ZONES } from '@aia-pama/shared';
import { RegisterForm } from './register-form';
import { SiteHeader } from '@/components/site-header';
import { mainNarrow, pageShell } from '@/lib/layout-classes';

export default function RegisterPage() {
  return (
    <div className={pageShell}>
      <SiteHeader
        title="Member registration"
        rightLink={{ href: '/login', label: 'Member Login' }}
      />
      <main className={mainNarrow}>
        <p className="text-base text-[#4D4D4D]">
          Membership sign-up is always open. ELECOM will review your application before
          you can log in and participate in the election.
        </p>
        <RegisterForm zones={[...ZONES]} />
        <p className="mt-6 text-center text-sm text-[#4D4D4D]">
          Already approved?{' '}
          <Link href="/login" className="font-semibold text-[#63A9FA] underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
