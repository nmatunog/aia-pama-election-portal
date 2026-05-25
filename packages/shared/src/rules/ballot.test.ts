import { describe, expect, it } from 'vitest';
import { validateBallot } from './ballot';

describe('validateBallot', () => {
  const zonalIds = new Set(['z1', 'z2']);
  const nationalIds = new Set(['n1', 'n2', 'n3']);

  it('accepts valid ballot', () => {
    const result = validateBallot(
      { zonalCandidateId: 'z1', nationalCandidateIds: ['n1', 'n2'] },
      { approvedZonalIds: zonalIds, approvedNationalIds: nationalIds },
    );
    expect(result.ok).toBe(true);
  });

  it('rejects more than 5 national votes', () => {
    const sixNational = new Set(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
    const result = validateBallot(
      {
        zonalCandidateId: 'z1',
        nationalCandidateIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
      },
      { approvedZonalIds: zonalIds, approvedNationalIds: sixNational },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Maximum 5');
  });

  it('rejects duplicate national candidates', () => {
    const result = validateBallot(
      { zonalCandidateId: 'z1', nationalCandidateIds: ['n1', 'n1'] },
      { approvedZonalIds: zonalIds, approvedNationalIds: nationalIds },
    );
    expect(result.ok).toBe(false);
  });

  it('rejects invalid zonal candidate', () => {
    const result = validateBallot(
      { zonalCandidateId: 'invalid', nationalCandidateIds: [] },
      { approvedZonalIds: zonalIds, approvedNationalIds: nationalIds },
    );
    expect(result.ok).toBe(false);
  });

  it('rejects zonal candidate outside voter zone', () => {
    const zones = new Map([
      ['z1', 'Visayas'],
      ['z2', 'Mindanao'],
    ]);
    const result = validateBallot(
      { zonalCandidateId: 'z2', nationalCandidateIds: [] },
      {
        approvedZonalIds: zonalIds,
        approvedNationalIds: nationalIds,
        voterZone: 'Visayas',
        zonalCandidateZones: zones,
      },
    );
    expect(result.ok).toBe(false);
  });
});
