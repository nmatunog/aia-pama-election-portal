import type { ElectionPhase } from './constants';

export type PhaseAccess = {
  canNominate: boolean;
  canVote: boolean;
  /** Primary dashboard tile highlight */
  primaryAction: 'nominate' | 'vote' | null;
};

/** Feature access by election phase — ELECOM controls phase transitions */
export function getPhaseAccess(phase: ElectionPhase): PhaseAccess {
  const canNominate = phase === 'nomination';
  const canVote = phase === 'voting';

  let primaryAction: PhaseAccess['primaryAction'] = null;
  if (canNominate) primaryAction = 'nominate';
  else if (canVote) primaryAction = 'vote';

  return { canNominate, canVote, primaryAction };
}

export const PHASE_BANNER_MESSAGES: Partial<Record<ElectionPhase, string>> = {
  nomination:
    'Nomination period is open. Members may nominate candidates for zonal and national Board of Director positions.',
  voting:
    'Voting is open. Cast your official ballot before the window closes.',
  canvassing: 'Voting has closed. ELECOM is canvassing results.',
  certified: 'Results have been certified by ELECOM.',
  failed: 'This election has been declared a failure of election.',
  draft: 'Election setup is in progress. Check back soon.',
};

export const VOTE_DISABLED_MESSAGE =
  'Voting opens when ELECOM activates the official voting period.';

export const NOMINATE_DISABLED_MESSAGE =
  'Nomination is not open at this time.';
