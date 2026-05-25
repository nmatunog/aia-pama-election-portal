import { describe, expect, it } from 'vitest';
import { validateCandidateAccept, validateCandidateDecline } from './candidate-response';

const base = {
  phase: 'nomination' as const,
  candidateStatus: 'pending_acceptance',
  candidateMemberId: 'member-1',
  voterMemberId: 'member-1',
};

describe('validateCandidateAccept', () => {
  it('accepts during nomination for self with pending status', () => {
    expect(validateCandidateAccept(base)).toEqual({ ok: true });
  });

  it('rejects outside nomination phase', () => {
    const result = validateCandidateAccept({ ...base, phase: 'voting' });
    expect(result.ok).toBe(false);
  });

  it('rejects wrong member', () => {
    const result = validateCandidateAccept({ ...base, voterMemberId: 'other' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-pending status', () => {
    const result = validateCandidateAccept({ ...base, candidateStatus: 'approved' });
    expect(result.ok).toBe(false);
  });
});

describe('validateCandidateDecline', () => {
  it('uses same guards as accept', () => {
    expect(validateCandidateDecline(base)).toEqual({ ok: true });
  });
});
