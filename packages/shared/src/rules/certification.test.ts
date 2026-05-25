import { describe, expect, it } from 'vitest';
import { assertCanCertifyElection, computeCertifiedResults } from './certification';

describe('assertCanCertifyElection', () => {
  it('allows certify only in canvassing', () => {
    expect(assertCanCertifyElection('canvassing').ok).toBe(true);
    expect(assertCanCertifyElection('voting').ok).toBe(false);
    expect(assertCanCertifyElection('certified').ok).toBe(false);
  });
});

describe('computeCertifiedResults', () => {
  it('elects zonal winner per zone and seats national by rank excluding zonal winners', () => {
    const anaMember = 'member-ana';
    const results = computeCertifiedResults([
      {
        candidateId: 'z-vis',
        memberId: anaMember,
        fullName: 'Ana Sy',
        type: 'zonal',
        zone: 'Visayas',
        voteCount: 20,
      },
      {
        candidateId: 'n-ana',
        memberId: anaMember,
        fullName: 'Ana Sy',
        type: 'national',
        zone: null,
        voteCount: 30,
      },
      {
        candidateId: 'n-bob',
        memberId: 'member-bob',
        fullName: 'Bob Lee',
        type: 'national',
        zone: null,
        voteCount: 25,
      },
      {
        candidateId: 'n-cara',
        memberId: 'member-cara',
        fullName: 'Cara Lim',
        type: 'national',
        zone: null,
        voteCount: 22,
      },
      {
        candidateId: 'n-dan',
        memberId: 'member-dan',
        fullName: 'Dan Go',
        type: 'national',
        zone: null,
        voteCount: 18,
      },
      {
        candidateId: 'n-eve',
        memberId: 'member-eve',
        fullName: 'Eve Tan',
        type: 'national',
        zone: null,
        voteCount: 15,
      },
      {
        candidateId: 'n-fay',
        memberId: 'member-fay',
        fullName: 'Fay Cruz',
        type: 'national',
        zone: null,
        voteCount: 12,
      },
      {
        candidateId: 'n-gus',
        memberId: 'member-gus',
        fullName: 'Gus Reyes',
        type: 'national',
        zone: null,
        voteCount: 10,
      },
    ]);

    expect(results.zonalWinners).toHaveLength(1);
    expect(results.zonalWinners[0]!.fullName).toBe('Ana Sy');
    expect(results.zonalWinners[0]!.zone).toBe('Visayas');

    expect(results.displacedFromNational).toHaveLength(1);
    expect(results.displacedFromNational[0]!.fullName).toBe('Ana Sy');

    const seated = results.nationalBoard.filter((s) => s.seated);
    expect(seated).toHaveLength(5);
    expect(seated[0]!.fullName).toBe('Bob Lee');
    expect(seated.some((s) => s.fullName === 'Ana Sy')).toBe(false);
  });
});
