import { describe, expect, it } from 'vitest';
import { getPhaseAccess } from './phase-access';

describe('getPhaseAccess', () => {
  it('defaults to nominate during nomination phase', () => {
    const access = getPhaseAccess('nomination');
    expect(access.canNominate).toBe(true);
    expect(access.canVote).toBe(false);
    expect(access.primaryAction).toBe('nominate');
  });

  it('opens vote only when ELECOM activates voting phase', () => {
    const access = getPhaseAccess('voting');
    expect(access.canNominate).toBe(false);
    expect(access.canVote).toBe(true);
    expect(access.primaryAction).toBe('vote');
  });

  it('disables both during canvassing', () => {
    const access = getPhaseAccess('canvassing');
    expect(access.canNominate).toBe(false);
    expect(access.canVote).toBe(false);
    expect(access.primaryAction).toBe(null);
  });
});
