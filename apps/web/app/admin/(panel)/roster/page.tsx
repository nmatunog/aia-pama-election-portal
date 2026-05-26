import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import {
  ElecomMemberApplications,
  type MemberApplication,
} from '@/components/elecom-member-applications';

export default async function ElecomRosterPage() {
  const res = await adminWorkerFetch('/admin/members/applications');
  const data = (await res.json()) as {
    ok: boolean;
    applications?: MemberApplication[];
    error?: string;
  };

  return (
    <>
      <h2 className={pageTitle}>Membership & roster</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        Approve new signups, manage voters on the{' '}
        <a href="/admin/voters" className="font-semibold text-[#63A9FA] underline">
          Voters
        </a>{' '}
        page (toggle inactive, delete inactive members without candidacy history).
      </p>
      <section className="mt-8">
        <h3 className="text-lg font-semibold text-[#1C1C1C]">Pending applications</h3>
        <div className="mt-4">
          {!data.ok ? (
            <p className="text-[#D41245]">{data.error ?? 'Could not load applications.'}</p>
          ) : (
            <ElecomMemberApplications initial={data.applications ?? []} />
          )}
        </div>
      </section>
    </>
  );
}
