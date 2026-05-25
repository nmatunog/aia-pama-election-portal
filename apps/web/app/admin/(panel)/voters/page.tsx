import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import {
  ElecomVotersTable,
  type AdminVoterRow,
} from '@/components/elecom-voters-table';

export default async function ElecomVotersPage() {
  const res = await adminWorkerFetch('/admin/voters');
  const data = (await res.json()) as {
    ok: boolean;
    voters?: AdminVoterRow[];
    stats?: { total: number; eligible: number; voted: number };
    error?: string;
  };

  if (!data.ok) {
    return <p className="text-[#D41245]">{data.error ?? 'Could not load voter roster.'}</p>;
  }

  return (
    <>
      <h2 className={pageTitle}>Qualified voters</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        Member roster with eligibility flags. Toggle good standing or active status for
        ELECOM corrections.
      </p>
      <div className="mt-6">
        <ElecomVotersTable
          initial={data.voters ?? []}
          initialZone="all"
          stats={data.stats ?? { total: 0, eligible: 0, voted: 0 }}
        />
      </div>
    </>
  );
}
