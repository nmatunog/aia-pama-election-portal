import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { pageTitle } from '@/lib/layout-classes';
import {
  ElecomCandidatesTable,
  type AdminCandidateRow,
} from '@/components/elecom-candidates-table';

export default async function ElecomCandidatesPage() {
  const res = await adminWorkerFetch('/admin/candidates?status=all');
  const data = (await res.json()) as {
    ok: boolean;
    electionId?: string;
    candidates?: AdminCandidateRow[];
    error?: string;
  };

  if (!data.ok || !data.electionId) {
    return <p className="text-[#D41245]">{data.error ?? 'Could not load nominees.'}</p>;
  }

  return (
    <>
      <h2 className={pageTitle}>Nominees &amp; candidates</h2>
      <p className="mt-2 text-base text-[#4D4D4D]">
        All candidacies for this election. Filter by status or edit a nominee&apos;s status
        (including approved ballot candidates).
      </p>
      <div className="mt-6">
        <ElecomCandidatesTable
          electionId={data.electionId}
          initial={data.candidates ?? []}
          initialFilter="all"
        />
      </div>
    </>
  );
}
