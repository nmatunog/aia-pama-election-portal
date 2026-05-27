import { Suspense } from 'react';
import { getElecomSession } from '@/lib/admin-session';
import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import {
  ElecomVotersTable,
  type AdminVoterRow,
} from '@/components/elecom-voters-table';

type RosterStats = {
  total: number;
  pending: number;
  eligible: number;
  voted: number;
};

async function MemberRosterContent() {
  const session = await getElecomSession();
  const res = await adminWorkerFetch('/admin/voters');
  const data = (await res.json()) as {
    ok: boolean;
    voters?: AdminVoterRow[];
    stats?: RosterStats;
    error?: string;
  };

  if (!data.ok) {
    return <p className="text-[#D41245]">{data.error ?? 'Could not load member roster.'}</p>;
  }

  return (
    <ElecomVotersTable
      initial={data.voters ?? []}
      initialZone="all"
      stats={data.stats ?? { total: 0, pending: 0, eligible: 0, voted: 0 }}
      canGrantElecom={session?.isSuperuser === true}
    />
  );
}

export default function ElecomMembersPage() {
  return (
    <>
      <h2 className={pageTitle}>Member roster</h2>
      <p className="mt-2 max-w-4xl text-base text-[#4D4D4D]">
        For pending signups, set <strong>Good standing</strong> and <strong>Active</strong> to
        Yes. You will then be prompted to approve. Use <strong>Disapproved</strong> in Actions to
        reject. Superusers may <strong>Grant ELECOM</strong> or revoke it.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-[#4D4D4D]">Loading roster…</p>}>
          <MemberRosterContent />
        </Suspense>
      </div>
    </>
  );
}
