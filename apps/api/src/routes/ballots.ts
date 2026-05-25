import { Hono } from 'hono';
import {
  submitBallotSchema,
  validateBallot,
  assertVotingPhase,
  validateVoterEligibility,
  type ElectionPhase,
} from '@aia-pama/shared';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';
import { findMemberById } from '../lib/supabase-members';
import {
  getBallotOptions,
  hasVoterParticipated,
  loadApprovedBallotCandidates,
  submitBallotPackage,
} from '../lib/supabase-ballots';
import { appendAuditLog } from '../lib/supabase-nominations';
import { requireVoter, type VoterVariables } from '../middleware/voter-auth';

export const ballotRoutes = new Hono<{ Bindings: Env; Variables: VoterVariables }>();

ballotRoutes.use('*', requireVoter);

async function verifyTurnstile(
  env: Env,
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (env.ENVIRONMENT === 'development') {
      return { ok: true };
    }
    return { ok: false, error: 'Bot verification is not configured' };
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    return { ok: false, error: 'Bot verification failed' };
  }
  return { ok: true };
}

function votingPhaseError(
  check: ReturnType<typeof assertVotingPhase>,
): string | null {
  if (check && !check.ok) return check.error;
  return null;
}

ballotRoutes.get('/options', async (c) => {
  const voter = c.get('voter');
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const options = await getBallotOptions(
    c.env,
    election.id,
    election.phase,
    voter.zone,
    voter.licenseHash,
  );

  return c.json({ ok: true, ...options });
});

ballotRoutes.get('/status', async (c) => {
  const voter = c.get('voter');
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const voted = await hasVoterParticipated(c.env, election.id, voter.licenseHash);
  return c.json({
    ok: true,
    electionId: election.id,
    phase: election.phase,
    hasVoted: voted,
  });
});

ballotRoutes.post('/submit', async (c) => {
  const voter = c.get('voter');
  const body = await c.req.json().catch(() => null);
  const parsed = submitBallotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      400,
    );
  }

  const turnstile = await verifyTurnstile(c.env, parsed.data.turnstileToken);
  if (!turnstile.ok) {
    return c.json({ ok: false, error: turnstile.error }, 400);
  }

  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  if (parsed.data.electionId !== election.id) {
    return c.json({ ok: false, error: 'Invalid election' }, 400);
  }

  const phaseErr = votingPhaseError(assertVotingPhase(election.phase as ElectionPhase));
  if (phaseErr) {
    return c.json({ ok: false, error: phaseErr }, 400);
  }

  const member = await findMemberById(c.env, voter.sub);
  if (!member) {
    return c.json({ ok: false, error: 'Member not found' }, 404);
  }

  const eligibility = validateVoterEligibility({
    goodStanding: member.good_standing,
    active: member.active,
  });
  if (!eligibility.ok) {
    return c.json({ ok: false, error: eligibility.error }, 403);
  }

  const alreadyVoted = await hasVoterParticipated(
    c.env,
    election.id,
    voter.licenseHash,
  );
  if (alreadyVoted) {
    return c.json({ ok: false, error: 'You have already voted in this election' }, 409);
  }

  const lists = await loadApprovedBallotCandidates(c.env, election.id, voter.zone);
  const approvedZonalIds = new Set(lists.zonal.map((x) => x.id));
  const approvedNationalIds = new Set(lists.national.map((x) => x.id));
  const zonalCandidateZones = new Map(
    lists.zonal.map((x) => [x.id, x.zone ?? voter.zone]),
  );

  const ballotCheck = validateBallot(
    {
      zonalCandidateId: parsed.data.zonalVote.candidateId,
      nationalCandidateIds: parsed.data.nationalVotes.candidateIds,
    },
    {
      approvedZonalIds,
      approvedNationalIds,
      voterZone: voter.zone,
      zonalCandidateZones,
    },
  );

  if (!ballotCheck.ok) {
    return c.json({ ok: false, error: ballotCheck.error }, 400);
  }

  const cfIp = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For');
  let ipHash: string | undefined;
  if (cfIp) {
    const data = new TextEncoder().encode(cfIp);
    const hash = await crypto.subtle.digest('SHA-256', data);
    ipHash = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const result = await submitBallotPackage(c.env, {
    electionId: election.id,
    zonalCandidateId: parsed.data.zonalVote.candidateId,
    nationalCandidateIds: parsed.data.nationalVotes.candidateIds,
    voterLicenseHash: voter.licenseHash,
    ipHash,
  });

  if ('error' in result) {
    const status = result.error.includes('already voted') ? 409 : 500;
    return c.json({ ok: false, error: result.error }, status);
  }

  await appendAuditLog(c.env, {
    actorType: 'voter',
    actorId: voter.sub,
    action: 'ballot.submit',
    entity: 'ballot',
    entityId: result.receiptToken,
    payload: { electionId: election.id },
  });

  return c.json({
    ok: true,
    receiptToken: result.receiptToken,
    message: 'Your ballot has been recorded. Save your receipt token for your records.',
  });
});
