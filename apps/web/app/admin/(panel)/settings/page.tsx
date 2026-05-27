import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getElecomSession, getElecomBearerToken } from '@/lib/admin-session';
import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import { LoginSecretForm } from './login-secret-form';

export default async function AdminSettingsPage() {
  const session = await getElecomSession();
  if (!session?.isSuperuser) redirect('/admin');

  // Build a synthetic Request so adminWorkerFetch can forward the session cookie
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const syntheticRequest = new Request('http://localhost/admin/settings', {
    headers: { cookie: cookieHeader },
  });

  const res = await adminWorkerFetch('/admin/login-secret', {}, syntheticRequest);
  const data = (await res.json()) as {
    ok: boolean;
    isSet?: boolean;
    masked?: string | null;
    error?: string;
  };

  const masked = data.ok ? (data.masked ?? null) : null;

  return (
    <>
      <h2 className={pageTitle}>Settings</h2>
      <p className="mt-1 mb-6 text-sm text-[#4D4D4D]">
        Superuser-only configuration. Changes take effect immediately.
      </p>

      <LoginSecretForm masked={masked} />
    </>
  );
}
