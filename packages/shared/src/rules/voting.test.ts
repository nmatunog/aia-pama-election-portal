import { describe, expect, it } from 'vitest';
import { assertVotingPhase, validateVoterEligibility } from './voting';

describe('voting rules', () => {
  it('allows ballot only in voting phase', () => {
    expect(assertVotingPhase('voting')).toBeNull();
    const blocked = assertVotingPhase('nomination');
    expect(blocked?.ok).toBe(false);
  });

  it('requires active member in good standing', () => {
    expect(validateVoterEligibility({ active: true, goodStanding: true }).ok).toBe(true);
    expect(validateVoterEligibility({ active: false, goodStanding: true }).ok).toBe(false);
    expect(validateVoterEligibility({ active: true, goodStanding: false }).ok).toBe(false);
  });
});
