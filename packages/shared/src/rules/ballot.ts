import { RULES } from '../constants';

export type BallotVoteInput = {
  zonalCandidateId: string;
  nationalCandidateIds: string[];
};

export type ValidationResult =
  | { ok: true; data: BallotVoteInput }
  | { ok: false; error: string };

/**
 * Validates ballot choices against Election Code hard rules.
 * Same logic used by Worker API and unit tests.
 */
export function validateBallot(
  input: BallotVoteInput,
  options: {
    approvedZonalIds: Set<string>;
    approvedNationalIds: Set<string>;
  },
): ValidationResult {
  const { zonalCandidateId, nationalCandidateIds } = input;
  const { approvedZonalIds, approvedNationalIds } = options;

  if (!approvedZonalIds.has(zonalCandidateId)) {
    return { ok: false, error: 'Invalid zonal candidate selection' };
  }

  if (nationalCandidateIds.length > RULES.MAX_NATIONAL_VOTES) {
    return {
      ok: false,
      error: `Maximum ${RULES.MAX_NATIONAL_VOTES} national votes allowed`,
    };
  }

  const uniqueNational = new Set(nationalCandidateIds);
  if (uniqueNational.size !== nationalCandidateIds.length) {
    return { ok: false, error: 'Duplicate national candidates not allowed' };
  }

  for (const id of nationalCandidateIds) {
    if (!approvedNationalIds.has(id)) {
      return { ok: false, error: 'Invalid national candidate selection' };
    }
  }

  if (nationalCandidateIds.includes(zonalCandidateId)) {
    return {
      ok: false,
      error: 'Cannot vote for the same person in zonal and national',
    };
  }

  return { ok: true, data: input };
}
