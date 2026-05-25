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
  it('accepts valid zonal nomination', () => {
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
  it('accepts valid national nomination with 3 endorsers', () => {
    const result = validateNationalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1', 'e2', 'e3'] },
      baseCtx({
        endorsers: [visayas('e1'), visayas('e2'), visayas('e3')],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects fewer than 3 endorsers', () => {
    const result = validateNationalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1', 'e2'] },
      baseCtx({ endorsers: [visayas('e1'), visayas('e2')] }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects when nominator exceeded national nomination limit', () => {
    const result = validateNationalNomination(
      { candidateMemberId: 'c1', endorserMemberIds: ['e1', 'e2', 'e3'] },
      baseCtx({
        nominatorNationalCount: 5,
        endorsers: [visayas('e1'), visayas('e2'), visayas('e3')],
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
