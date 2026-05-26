import { Suspense } from 'react';
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
    />
  );
}

export default function ElecomMembersPage() {
  return (
    <>
      <h2 className={pageTitle}>Member roster</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        One place to approve new signups, set good standing and active status, edit
        position and agency, and <strong>Grant ELECOM</strong> for committee admin access.
        Promoted members sign in at /login with their license (same as members) and open
        /admin. Pending applications are highlighted — use <strong>Approve signup</strong>{' '}
        first.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-[#4D4D4D]">Loading roster…</p>}>
          <MemberRosterContent />
        </Suspense>
      </div>
    </>
  );
}
