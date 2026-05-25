import Link from 'next/link';
import {
  PHASE_BANNER_MESSAGES,
  PHASE_LABELS,
  ZONES,
  type ElectionPhase,
} from '@aia-pama/shared';
import { PhaseBanner } from '@aia-pama/ui';
import {
  CertifiedResultsAnnouncement,
  type CertifiedAnnouncementData,
} from '@/components/certified-results-announcement';
import { GroupedResultsDisplay } from '@/components/grouped-results-display';
import { SiteHeader } from '@/components/site-header';
import { mainWide, pageShell, pageTitle } from '@/lib/layout-classes';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

type PublicCandidate = {
  id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  full_name: string;
};

type PublicResult = {
  candidate_id: string;
  type: 'zonal' | 'national';
  zone: string | null;
  full_name: string;
  vote_count: number;
};

type PublicResponse = {
  ok: boolean;
  election?: {
    id: string;
    cycle_year: number;
    phase: string;
    voting_closes_at: string | null;
  };
  candidates?: PublicCandidate[];
  turnout?: number;
  results?: PublicResult[];
  showResults?: boolean;
  error?: string;
};

export default async function CandidatesPage() {
  let data: PublicResponse = { ok: false, error: 'Election information unavailable.' };
  try {
    const res = await fetch(`${WORKER_URL}/public/candidates`, { cache: 'no-store' });
    data = (await res.json()) as PublicResponse;
  } catch {
    data = { ok: false, error: 'Could not reach the election API.' };
  }

  let certifiedAnnouncement: CertifiedAnnouncementData | null = null;
  if (data.election?.phase === 'certified') {
    try {
      const certRes = await fetch(`${WORKER_URL}/elections/certified-announcement`, {
        cache: 'no-store',
      });
      certifiedAnnouncement = (await certRes.json()) as CertifiedAnnouncementData;
    } catch {
      certifiedAnnouncement = null;
    }
  }

  if (!data.ok || !data.election) {
    return (
      <div className={`${pageShell} px-4 py-16 text-center`}>
        <p className="text-[#D41245]">{data.error ?? 'Election information unavailable.'}</p>
        <p className="mt-2 text-sm text-[#4D4D4D]">Ensure npm run dev:api is running.</p>
        <Link href="/" className="mt-4 inline-block text-[#63A9FA] underline">
          Home
        </Link>
      </div>
    );
  }

  const phase = data.election.phase as ElectionPhase;
  const phaseLabel = PHASE_LABELS[phase] ?? phase;
  const bannerMessage = PHASE_BANNER_MESSAGES[phase];

  const candidates = data.candidates ?? [];
  const zonalByZone = new Map<string, PublicCandidate[]>();
  for (const z of ZONES) zonalByZone.set(z, []);
  const national: PublicCandidate[] = [];

  for (const c of candidates) {
    if (c.type === 'national') {
      national.push(c);
    } else if (c.zone) {
      const list = zonalByZone.get(c.zone) ?? [];
      list.push(c);
      zonalByZone.set(c.zone, list);
    }
  }

  const resultsById = new Map(
    (data.results ?? []).map((r) => [r.candidate_id, Number(r.vote_count) || 0]),
  );

  function voteLabel(candidateId: string): string | null {
    if (!data.showResults) return null;
    const count = resultsById.get(candidateId);
    if (count === undefined) return '— 0 votes';
    return `— ${count} vote${count === 1 ? '' : 's'}`;
  }

  return (
    <div className={pageShell}>
      <SiteHeader
        title="Election Information"
        rightLink={{ href: '/login', label: 'Member Login' }}
      />

      <main className={mainWide}>
        <h1 className={pageTitle}>{data.election.cycle_year} Board of Directors Election</h1>

        {bannerMessage && (
          <div className="mt-4">
            <PhaseBanner phase={phase} message={bannerMessage} />
          </div>
        )}

        {certifiedAnnouncement?.ok && (
          <CertifiedResultsAnnouncement data={certifiedAnnouncement} />
        )}

        <p className="mt-4 text-base text-[#4D4D4D]">
          Phase: <span className="font-semibold text-[#1C1C1C]">{phaseLabel}</span>
        </p>

        {(phase === 'voting' || phase === 'canvassing' || phase === 'certified') && (
          <p className="mt-4 rounded-lg border-2 border-[#E8E6E3] bg-white px-4 py-3 text-base">
            <span className="font-semibold text-[#1C1C1C]">{data.turnout ?? 0}</span> members
            have cast a ballot (turnout only — individual votes remain secret).
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">Approved candidates</h2>
          {candidates.length === 0 ? (
            <p className="mt-3 text-[#4D4D4D]">No approved candidates on the ballot yet.</p>
          ) : (
            <div className="mt-6 space-y-8">
              {ZONES.map((zone) => {
                const zoneCandidates = zonalByZone.get(zone) ?? [];
                if (zoneCandidates.length === 0) return null;
                return (
                  <div key={zone}>
                    <h3 className="font-semibold text-[#1C1C1C]">{zone} (zonal)</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-base text-[#4D4D4D]">
                      {zoneCandidates.map((c) => (
                        <li key={c.id}>
                          {c.full_name}
                          {voteLabel(c.id) && (
                            <span className="ml-2 text-sm font-medium text-[#D41245]">
                              {voteLabel(c.id)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {national.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1C1C1C]">National</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-base text-[#4D4D4D]">
                    {national.map((c) => (
                      <li key={c.id}>
                        {c.full_name}
                        {voteLabel(c.id) && (
                          <span className="ml-2 text-sm font-medium text-[#D41245]">
                            {voteLabel(c.id)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {data.showResults && (
          <section className="mt-10 rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#1C1C1C]">
              {phase === 'certified' ? 'Certified results' : 'Canvassing results'}
            </h2>
            <p className="mt-2 text-sm text-[#4D4D4D]">
              Vote totals grouped by zone, then national. Individual ballots are not
              disclosed.
            </p>
            <GroupedResultsDisplay
              results={(data.results ?? []).map((r) => ({
                candidateId: r.candidate_id,
                fullName: r.full_name,
                type: r.type,
                zone: r.zone,
                voteCount: Number(r.vote_count) || 0,
              }))}
            />
          </section>
        )}

        {phase === 'voting' && (
          <p className="mt-8">
            <Link href="/login?next=/vote" className="font-semibold text-[#63A9FA] underline">
              Sign in to cast your ballot
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
