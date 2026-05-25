import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import {
  ElecomNominationsTable,
  type AdminNominationRow,
} from '@/components/elecom-nominations-table';

export default async function ElecomNominationsPage() {
  const res = await adminWorkerFetch('/admin/nominations');
  const data = (await res.json()) as {
    ok: boolean;
    nominations?: AdminNominationRow[];
    error?: string;
  };

  if (!data.ok) {
    return <p className="text-[#D41245]">{data.error ?? 'Could not load nominations.'}</p>;
  }

  return (
    <>
      <h2 className={pageTitle}>Nominations</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        Filed nominations with endorser counts and linked candidate status.
      </p>
      <div className="mt-6">
        <ElecomNominationsTable nominations={data.nominations ?? []} />
      </div>
    </>
  );
}
