import { RULES, ZONES, type ElectionPhase } from '../constants';

export type ResultTallyRow = {
  candidateId: string;
  memberId: string;
  fullName: string;
  type: 'zonal' | 'national';
  zone: string | null;
  voteCount: number;
};

export type ZonalWinner = {
  zone: string;
  candidateId: string;
  memberId: string;
  fullName: string;
  voteCount: number;
};

export type NationalSeat = {
  rank: number;
  candidateId: string;
  memberId: string;
  fullName: string;
  voteCount: number;
  seated: boolean;
  note?: string;
};

export type CertificationValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** ELECOM may certify only after voting closes and canvassing is complete. */
export function assertCanCertifyElection(phase: ElectionPhase): CertificationValidationResult {
  if (phase === 'certified') {
    return { ok: false, error: 'This election is already certified' };
  }
  if (phase !== 'canvassing') {
    return {
      ok: false,
      error: 'Certification is only available during the canvassing phase (after voting closes)',
    };
  }
  return { ok: true };
}

export type CertifiedElectionResults = {
  zonalWinners: ZonalWinner[];
  nationalBoard: NationalSeat[];
  /** Members who won zonal and were skipped for national seating */
  displacedFromNational: Array<{
    memberId: string;
    fullName: string;
    zonalZone: string;
    nationalVoteCount: number;
  }>;
};

/**
 * Certify election results per Election Code:
 * - One zonal director per zone (highest zonal votes; must run in own zone).
 * - Up to 5 national directors by vote rank, excluding anyone elected zonal.
 */
export function computeCertifiedResults(
  tallies: ResultTallyRow[],
): CertifiedElectionResults {
  const zonalRows = tallies.filter((t) => t.type === 'zonal');
  const nationalRows = tallies.filter((t) => t.type === 'national');

  const zonalWinners: ZonalWinner[] = [];

  for (const zone of ZONES) {
    const inZone = zonalRows.filter((t) => t.zone === zone);
    if (inZone.length === 0) continue;

    const winner = [...inZone].sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.fullName.localeCompare(b.fullName);
    })[0]!;

    zonalWinners.push({
      zone,
      candidateId: winner.candidateId,
      memberId: winner.memberId,
      fullName: winner.fullName,
      voteCount: winner.voteCount,
    });
  }

  const zonalWinnerMemberIds = new Set(zonalWinners.map((w) => w.memberId));
  const displacedFromNational: CertifiedElectionResults['displacedFromNational'] = [];

  const nationalRanked = [...nationalRows].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.fullName.localeCompare(b.fullName);
  });

  const nationalBoard: NationalSeat[] = [];
  let rank = 0;

  for (const row of nationalRanked) {
    rank++;
    if (zonalWinnerMemberIds.has(row.memberId)) {
      const zonalWin = zonalWinners.find((w) => w.memberId === row.memberId);
      displacedFromNational.push({
        memberId: row.memberId,
        fullName: row.fullName,
        zonalZone: zonalWin?.zone ?? row.zone ?? '',
        nationalVoteCount: row.voteCount,
      });
      nationalBoard.push({
        rank,
        candidateId: row.candidateId,
        memberId: row.memberId,
        fullName: row.fullName,
        voteCount: row.voteCount,
        seated: false,
        note: `Not seated — elected zonal director for ${zonalWin?.zone ?? 'their zone'}`,
      });
      continue;
    }

    if (nationalBoard.filter((s) => s.seated).length < RULES.MAX_NATIONAL_VOTES) {
      nationalBoard.push({
        rank,
        candidateId: row.candidateId,
        memberId: row.memberId,
        fullName: row.fullName,
        voteCount: row.voteCount,
        seated: true,
      });
    } else {
      nationalBoard.push({
        rank,
        candidateId: row.candidateId,
        memberId: row.memberId,
        fullName: row.fullName,
        voteCount: row.voteCount,
        seated: false,
        note: 'Not seated — national board filled (5 directors)',
      });
    }
  }

  return { zonalWinners, nationalBoard, displacedFromNational };
}
