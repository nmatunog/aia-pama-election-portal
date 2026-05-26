'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RULES } from '@aia-pama/shared';
import {
  apiGet,
  apiPost,
  type MemberSearchResult,
  type NominationLimits,
  type SubmitNominationResponse,
} from '@/lib/api';
import {
  actionRowPrimaryFirst,
  inputField,
  listScroll,
  primaryBtn,
  secondaryBtn,
} from '@/lib/layout-classes';

type NominationType = 'zonal' | 'national';
type WizardStep = 'type' | 'candidate' | 'review' | 'done';

type Props = {
  electionId: string;
  memberId: string;
  memberName: string;
  memberZone: string;
  limits: NominationLimits;
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-[#4D4D4D]">
      Step {current} of {total}
    </p>
  );
}

export function NominateWizard({
  electionId,
  memberId,
  memberName,
  memberZone,
  limits,
}: Props) {
  const [step, setStep] = useState<WizardStep>('type');
  const [nomType, setNomType] = useState<NominationType | null>(null);
  const [candidate, setCandidate] = useState<MemberSearchResult | null>(null);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidateResults, setCandidateResults] = useState<MemberSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalSteps = 3;

  const searchMembers = useCallback(
    async (
      q: string,
      type: NominationType,
    ): Promise<{ members: MemberSearchResult[]; error?: string }> => {
      const params = new URLSearchParams({ type, q });
      if (type === 'zonal') params.set('zone', memberZone);
      const data = await apiGet<{ ok: boolean; members?: MemberSearchResult[]; error?: string }>(
        `/members/search?${params}`,
      );
      if (!data.ok) {
        return {
          members: [],
          error: data.error ?? 'Could not load members. Try signing in again.',
        };
      }
      return { members: data.members ?? [] };
    },
    [memberZone],
  );

  useEffect(() => {
    if (step !== 'candidate' || !nomType) return;
    setError(null);
    const t = window.setTimeout(async () => {
      const { members, error: searchError } = await searchMembers(candidateQuery, nomType);
      setCandidateResults(members);
      setError(searchError ?? null);
    }, 300);
    return () => window.clearTimeout(t);
  }, [candidateQuery, nomType, step, searchMembers]);

  function pickType(type: NominationType) {
    setNomType(type);
    setCandidate(null);
    setError(null);
    setStep('candidate');
  }

  async function handleSubmit() {
    if (!nomType || !candidate) return;
    setError(null);
    setLoading(true);
    try {
      const path = nomType === 'zonal' ? '/nominations/zonal' : '/nominations/national';
      const data = await apiPost<SubmitNominationResponse>(path, {
        electionId,
        candidateMemberId: candidate.id,
        endorserMemberIds: [],
      });
      if (!data.ok) {
        setError(data.error ?? 'Could not submit nomination');
        return;
      }
      setSuccessMessage(data.message ?? 'Nomination submitted successfully.');
      setStep('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-lg border-l-4 border-l-[#1A7A3A] bg-white px-4 py-4 border border-[#E8E6E3]">
          <p className="text-lg font-semibold text-[#1A7A3A]">Nomination submitted</p>
          <p className="mt-2 text-base text-[#4D4D4D]">{successMessage}</p>
        </div>
        <Link href="/dashboard" className={`${primaryBtn} text-center`}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div className="mt-8 space-y-6">
        <StepIndicator current={1} total={totalSteps} />
        <p className="text-base text-[#4D4D4D]">
          Choose the type of Board of Director nomination for <strong>{memberName}</strong> (
          {memberZone}).
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={!limits.canSubmitZonal}
            onClick={() => pickType('zonal')}
            className={`min-h-[48px] rounded-xl border-2 p-5 text-left transition-colors sm:p-6 ${
              limits.canSubmitZonal
                ? 'border-[#D41245] bg-[#FDF2F5] hover:bg-white'
                : 'cursor-not-allowed border-[#E8E6E3] opacity-60'
            }`}
          >
            <p className="text-lg font-semibold text-[#1C1C1C]">Zonal</p>
            <p className="mt-2 text-sm text-[#4D4D4D]">
              Zonal seat for <strong>{memberZone}</strong> only — nominee must be a member of your
              zone. The same person may also be nominated nationally.
            </p>
            {!limits.canSubmitZonal && (
              <p className="mt-2 text-sm font-medium text-[#9A6700]">
                {limits.nominatorZonalCount
                  ? 'You already filed a zonal nomination.'
                  : 'Your zone already has 3 zonal nominees.'}
              </p>
            )}
          </button>

          <button
            type="button"
            disabled={!limits.canSubmitNational}
            onClick={() => pickType('national')}
            className={`min-h-[48px] rounded-xl border-2 p-5 text-left transition-colors sm:p-6 ${
              limits.canSubmitNational
                ? 'border-[#D41245] bg-[#FDF2F5] hover:bg-white'
                : 'cursor-not-allowed border-[#E8E6E3] opacity-60'
            }`}
          >
            <p className="text-lg font-semibold text-[#1C1C1C]">National</p>
            <p className="mt-2 text-sm text-[#4D4D4D]">
              National Board seat — nominees may be from any zone. A zonal nominee may also run
              nationally; if they win their zone, they are not seated on the national board.
            </p>
            {!limits.canSubmitNational && (
              <p className="mt-2 text-sm font-medium text-[#9A6700]">
                {(limits.nominatorNationalCount ?? 0) >= RULES.MAX_NATIONAL_NOMINATIONS_PER_MEMBER
                  ? 'You reached your 5 national nominations.'
                  : 'The election already has 10 national nominees.'}
              </p>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'candidate') {
    return (
      <div className="mt-8 space-y-5">
        <StepIndicator current={2} total={totalSteps} />
        <p className="text-base text-[#4D4D4D]">
          Search and select the member you are nominating for a{' '}
          <strong>{nomType === 'zonal' ? 'zonal' : 'national'}</strong> Board of Director seat.
          {nomType === 'zonal' ? (
            <>
              {' '}
              You may nominate <strong>yourself</strong> or another member in{' '}
              <strong>{memberZone}</strong>. Names load automatically below.
            </>
          ) : (
            <> You may nominate any eligible member in the roster.</>
          )}
        </p>

        <div>
          <label htmlFor="candidate-search" className="mb-2 block text-base font-semibold text-[#1C1C1C]">
            Search by name
          </label>
          <input
            id="candidate-search"
            type="search"
            value={candidateQuery}
            onChange={(e) => setCandidateQuery(e.target.value)}
            placeholder="Type at least 2 letters…"
            className={inputField}
          />
        </div>

        {candidate && (
          <div className="rounded-lg border-2 border-[#D41245] bg-[#FDF2F5] px-4 py-3">
            <p className="font-semibold text-[#1C1C1C]">Selected: {candidate.full_name}</p>
            <p className="text-sm text-[#4D4D4D]">{candidate.zone}</p>
          </div>
        )}

        <ul className={listScroll}>
          {candidateResults.length === 0 ? (
            <li className="rounded-lg border-2 border-dashed border-[#E8E6E3] px-4 py-6 text-center text-base text-[#4D4D4D]">
              No members found. Try another search, or ensure members are seeded (
              <code className="text-sm">npm run seed:members</code>).
            </li>
          ) : (
            candidateResults.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCandidate(m);
                    setError(null);
                  }}
                  className={`w-full min-h-[48px] rounded-lg border-2 px-4 py-3 text-left text-base transition-colors ${
                    candidate?.id === m.id
                      ? 'border-[#D41245] bg-[#FDF2F5]'
                      : 'border-[#E8E6E3] bg-white hover:border-[#4D4D4D]/30'
                  }`}
                >
                  <span className="block font-semibold text-[#1C1C1C] sm:inline">
                    {m.full_name}
                    {m.id === memberId && (
                      <span className="ml-0 text-sm font-semibold text-[#D41245] sm:ml-2">
                        {' '}
                        (You)
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-[#4D4D4D] sm:ml-2 sm:inline">{m.zone}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {error && (
          <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
            {error}
          </p>
        )}

        <div className={actionRowPrimaryFirst}>
          <button type="button" className={secondaryBtn} onClick={() => setStep('type')}>
            ← Back
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={!candidate}
            onClick={() => {
              if (!candidate) {
                setError('Please select a candidate.');
                return;
              }
              setStep('review');
            }}
          >
            Review Nomination
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <StepIndicator current={3} total={totalSteps} />
      <div className="rounded-xl border-2 border-[#E8E6E3] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1C1C1C]">Review before submitting</h2>
        <dl className="mt-4 space-y-3 text-base">
          <div>
            <dt className="text-sm font-semibold uppercase text-[#4D4D4D]">Type</dt>
            <dd className="text-[#1C1C1C] capitalize">{nomType}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase text-[#4D4D4D]">Candidate</dt>
            <dd className="text-[#1C1C1C]">
              {candidate?.full_name} ({candidate?.zone})
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase text-[#4D4D4D]">Nominator</dt>
            <dd className="text-[#1C1C1C]">
              {memberName} ({memberZone})
            </dd>
          </div>
        </dl>
      </div>

      {error && (
        <p className="rounded-lg bg-[#FDF2F5] px-4 py-3 text-sm font-medium text-[#D41245]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className={secondaryBtn} onClick={() => setStep('candidate')}>
          ← Back
        </button>
        <button type="button" className={primaryBtn} disabled={loading} onClick={handleSubmit}>
          {loading ? 'Submitting…' : 'Submit Nomination'}
        </button>
      </div>
    </div>
  );
}
