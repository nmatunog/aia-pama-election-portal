export type CandidateResponseContext = {
  phase: string;
  candidateStatus: string;
  candidateMemberId: string;
  voterMemberId: string;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateCandidateAccept(
  ctx: CandidateResponseContext,
): ValidationResult {
  if (ctx.phase !== 'nomination') {
    return { ok: false, error: 'Candidate acceptance is only allowed during the nomination period' };
  }
  if (ctx.candidateMemberId !== ctx.voterMemberId) {
    return { ok: false, error: 'You may only respond to nominations for yourself' };
  }
  if (ctx.candidateStatus !== 'pending_acceptance') {
    return { ok: false, error: 'This nomination is no longer awaiting your response' };
  }
  return { ok: true };
}

export function validateCandidateDecline(
  ctx: CandidateResponseContext,
): ValidationResult {
  return validateCandidateAccept(ctx);
}
