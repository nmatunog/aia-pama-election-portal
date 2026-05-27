import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ElecomNav } from '@/components/elecom-nav';
import { getElecomSession } from '@/lib/admin-session';
import { mainWide, pageShell } from '@/lib/layout-classes';

async function signOut() {
  'use server';
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.delete('aia_admin_session');
  store.delete('aia_session');
  redirect('/admin/login');
}

export default async function ElecomPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getElecomSession();
  if (!session) redirect('/admin/login');

  return (
    <div className={pageShell}>
      <header className="border-b border-[#E8E6E3] bg-white safe-top">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-[#1C1C1C] sm:text-xl">ELECOM Administration</h1>
            <p className="text-sm text-[#4D4D4D]">
              {session.email}
              {session.viaMemberLogin ? ' · superuser' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="text-base font-semibold text-[#63A9FA] underline">
              Public portal
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-base font-semibold text-[#63A9FA] underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className={`${mainWide} max-w-6xl safe-bottom`}>
        <div className="mt-6">
          <ElecomNav isSuperuser={session.isSuperuser} />
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
