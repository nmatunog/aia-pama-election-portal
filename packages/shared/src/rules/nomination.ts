import { RULES, type Zone } from '../constants';
import type { ElectionPhase } from '../constants';

export type NominationMember = {
  id: string;
  zone: Zone | string;
  goodStanding: boolean;
  active: boolean;
};

export type ZonalNominationPayload = {
  candidateMemberId: string;
  endorserMemberIds: string[];
};

export type NationalNominationPayload = {
  candidateMemberId: string;
  endorserMemberIds: string[];
};

export type NominationValidationContext = {
  phase: ElectionPhase;
  nominator: NominationMember;
  candidate: NominationMember;
  endorsers: NominationMember[];
  nominatorZonalCount: number;
  nominatorNationalCount: number;
  zonalCandidatesInZone: number;
  nationalCandidatesCount: number;
  candidateAlreadyNominatedZonal: boolean;
  candidateAlreadyNominatedNational: boolean;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function assertNominationPhase(phase: ElectionPhase): ValidationResult | null {
  if (phase !== 'nomination') {
    return { ok: false, error: 'Nominations are only accepted during the nomination period' };
  }
  return null;
}

function assertEligibleMember(
  member: NominationMember,
  label: string,
): ValidationResult | null {
  if (!member.active || !member.goodStanding) {
    return { ok: false, error: `${label} is not eligible to participate` };
  }
  return null;
}

function assertDistinctEndorsers(endorserMemberIds: string[]): ValidationResult | null {
  const unique = new Set(endorserMemberIds);
  if (unique.size !== endorserMemberIds.length) {
    return { ok: false, error: 'Each endorser may only be listed once' };
  }
  return null;
}

function assertEndorsersNotIncludingNominator(
  nominatorId: string,
  endorserMemberIds: string[],
): ValidationResult | null {
  if (endorserMemberIds.includes(nominatorId)) {
    return { ok: false, error: 'You cannot endorse your own nomination' };
  }
  return null;
}

/** Validates zonal Board of Director nomination per Election Code rules */
export function validateZonalNomination(
  input: ZonalNominationPayload,
  ctx: NominationValidationContext,
): ValidationResult {
  const phaseErr = assertNominationPhase(ctx.phase);
  if (phaseErr) return phaseErr;

  const nominatorErr = assertEligibleMember(ctx.nominator, 'Nominator');
  if (nominatorErr) return nominatorErr;

  const candidateErr = assertEligibleMember(ctx.candidate, 'Candidate');
  if (candidateErr) return candidateErr;

  if (ctx.nominatorZonalCount >= 1) {
    return { ok: false, error: 'You have already submitted a zonal nomination for this election' };
  }

  if (ctx.zonalCandidatesInZone >= RULES.MAX_ZONAL_NOMINEES_PER_ZONE) {
    return {
      ok: false,
      error: `This zone already has ${RULES.MAX_ZONAL_NOMINEES_PER_ZONE} zonal nominees`,
    };
  }

  if (ctx.candidateAlreadyNominatedZonal) {
    return { ok: false, error: 'This member is already a zonal nominee for this election' };
  }

  if (ctx.candidate.zone !== ctx.nominator.zone) {
    return {
      ok: false,
      error: 'Zonal candidates must be from your zone',
    };
  }

  if (input.endorserMemberIds.length < RULES.MIN_ZONAL_ENDORSERS) {
    return {
      ok: false,
      error: `At least ${RULES.MIN_ZONAL_ENDORSERS} endorser is required for a zonal nomination`,
    };
  }

  const distinctErr = assertDistinctEndorsers(input.endorserMemberIds);
  if (distinctErr) return distinctErr;

  const selfEndorseErr = assertEndorsersNotIncludingNominator(
    ctx.nominator.id,
    input.endorserMemberIds,
  );
  if (selfEndorseErr) return selfEndorseErr;

  if (input.candidateMemberId !== ctx.candidate.id) {
    return { ok: false, error: 'Candidate record mismatch' };
  }

  if (ctx.endorsers.length !== input.endorserMemberIds.length) {
    return { ok: false, error: 'One or more endorsers were not found' };
  }

  for (const endorser of ctx.endorsers) {
    const err = assertEligibleMember(endorser, 'Endorser');
    if (err) return err;
    if (endorser.zone !== ctx.nominator.zone) {
      return { ok: false, error: 'Zonal endorsers must be from your zone' };
    }
  }

  return { ok: true };
}

/** Validates national Board of Director nomination per Election Code rules */
export function validateNationalNomination(
  input: NationalNominationPayload,
  ctx: NominationValidationContext,
): ValidationResult {
  const phaseErr = assertNominationPhase(ctx.phase);
  if (phaseErr) return phaseErr;

  const nominatorErr = assertEligibleMember(ctx.nominator, 'Nominator');
  if (nominatorErr) return nominatorErr;

  const candidateErr = assertEligibleMember(ctx.candidate, 'Candidate');
  if (candidateErr) return candidateErr;

  if (ctx.nominatorNationalCount >= RULES.MAX_NATIONAL_NOMINATIONS_PER_MEMBER) {
    return {
      ok: false,
      error: `You may submit at most ${RULES.MAX_NATIONAL_NOMINATIONS_PER_MEMBER} national nominations`,
    };
  }

  if (ctx.nationalCandidatesCount >= RULES.MAX_NATIONAL_NOMINEES) {
    return {
      ok: false,
      error: `The election already has ${RULES.MAX_NATIONAL_NOMINEES} national nominees`,
    };
  }

  if (ctx.candidateAlreadyNominatedNational) {
    return { ok: false, error: 'This member is already a national nominee for this election' };
  }

  if (input.endorserMemberIds.length < RULES.MIN_NATIONAL_ENDORSERS) {
    return {
      ok: false,
      error: `At least ${RULES.MIN_NATIONAL_ENDORSERS} endorsers are required for a national nomination`,
    };
  }

  const distinctErr = assertDistinctEndorsers(input.endorserMemberIds);
  if (distinctErr) return distinctErr;

  const selfEndorseErr = assertEndorsersNotIncludingNominator(
    ctx.nominator.id,
    input.endorserMemberIds,
  );
  if (selfEndorseErr) return selfEndorseErr;

  if (input.candidateMemberId !== ctx.candidate.id) {
    return { ok: false, error: 'Candidate record mismatch' };
  }

  if (ctx.endorsers.length !== input.endorserMemberIds.length) {
    return { ok: false, error: 'One or more endorsers were not found' };
  }

  for (const endorser of ctx.endorsers) {
    const err = assertEligibleMember(endorser, 'Endorser');
    if (err) return err;
  }

  return { ok: true };
}

export function canSubmitZonalNomination(ctx: NominationValidationContext): boolean {
  return (
    ctx.phase === 'nomination' &&
    ctx.nominatorZonalCount < 1 &&
    ctx.zonalCandidatesInZone < RULES.MAX_ZONAL_NOMINEES_PER_ZONE
  );
}

export function canSubmitNationalNomination(ctx: NominationValidationContext): boolean {
  return (
    ctx.phase === 'nomination' &&
    ctx.nominatorNationalCount < RULES.MAX_NATIONAL_NOMINATIONS_PER_MEMBER &&
    ctx.nationalCandidatesCount < RULES.MAX_NATIONAL_NOMINEES
  );
}
