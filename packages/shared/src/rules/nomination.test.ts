import { describe, expect, it } from 'vitest';
import {
  canSubmitNationalNomination,
  canSubmitZonalNomination,
  validateNationalNomination,
  validateZonalNomination,
  type NominationMember,
  type NominationValidationContext,
} from './nomination';

const visayas = (id: string): NominationMember => ({
  id,
  zone: 'Visayas',
  goodStanding: true,
  active: true,
});

function baseCtx(
  overrides: Partial<NominationValidationContext> = {},
): NominationValidationContext {
  return {
    phase: 'nomination',
    nominator: visayas('n1'),
    candidate: visayas('c1'),
    endorsers: [visayas('e1')],
    nominatorZonalCount: 0,
    nominatorNationalCount: 0,
    zonalCandidatesInZone: 0,
    nationalCandidatesCount: 0,
    candidateAlreadyNominatedZonal: false,
    candidateAlreadyNominatedNational: false,
    ...overrides,
  };
}

describe('validateZonalNomination', () => {
  it('accepts valid zonal nomination without endorsers', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: [] },
      baseCtx({ endorsers: [] }),
    );
    expect(result.ok).toBe(true);
  });

  it('accepts valid zonal nomination with endorsers when provided', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1'] },
      baseCtx(),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects when phase is not nomination', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1'] },
      baseCtx({ phase: 'voting' }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects candidate from another zone', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1'] },
      baseCtx({
        candidate: { id: 'c1', zone: 'Manila 1', goodStanding: true, active: true },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects when zone cap reached', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1'] },
      baseCtx({ zonalCandidatesInZone: 3 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3');
  });

  it('rejects self as endorser', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['n1'] },
      baseCtx({ endorsers: [visayas('n1')] }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('validateNationalNomination', () => {
  it('accepts valid national nomination without endorsers', () => {
    const result = validateNationalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: [] },
      baseCtx({ endorsers: [] }),
    );
    expect(result.ok).toBe(true);
  });

  it('allows national nomination when member already has zonal candidacy', () => {
    const result = validateNationalNomination(
      {
        candidateMemberId: 'c1',
        endorserMemberIds: [],
      },
      baseCtx({
        candidateAlreadyNominatedZonal: true,
        endorsers: [],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('allows zonal nomination when member already has national candidacy', () => {
    const result = validateZonalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1'] },
      baseCtx({ candidateAlreadyNominatedNational: true }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects when nominator exceeded national nomination limit', () => {
    const result = validateNationalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: [] },
      baseCtx({
        nominatorNationalCount: 5,
        endorsers: [],
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('canSubmit helpers', () => {
  it('canSubmitZonalNomination reflects caps', () => {
    expect(canSubmitZonalNomination(baseCtx())).toBe(true);
    expect(canSubmitZonalNomination(baseCtx({ nominatorZonalCount: 1 }))).toBe(false);
  });

  it('canSubmitNationalNomination reflects caps', () => {
    expect(canSubmitNationalNomination(baseCtx())).toBe(true);
    expect(canSubmitNationalNomination(baseCtx({ nationalCandidatesCount: 10 }))).toBe(
      false,
    );
  });
});
