import type { ElectionPhase } from '../constants';

export type VoterEligibility = {
  goodStanding: boolean;
  active: boolean;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function assertVotingPhase(phase: ElectionPhase): ValidationResult | null {
  if (phase !== 'voting') {
    return { ok: false, error: 'Ballots are only accepted during the voting period' };
  }
  return null;
}

export function validateVoterEligibility(voter: VoterEligibility): ValidationResult {
  if (!voter.active) {
    return { ok: false, error: 'Your membership is not active' };
  }
  if (!voter.goodStanding) {
    return { ok: false, error: 'You must be in good standing to vote' };
  }
  return { ok: true };
}
