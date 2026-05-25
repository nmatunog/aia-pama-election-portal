import { Hono, type Context } from 'hono';
import {
  candidateResponseSchema,
  validateCandidateAccept,
  validateCandidateDecline,
} from '@aia-pama/shared';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';
import {
  getCandidateForMember,
  listPendingInvitations,
  updateCandidateStatus,
} from '../lib/supabase-candidates';
import { appendAuditLog } from '../lib/supabase-nominations';
import { requireVoter, type VoterVariables } from '../middleware/voter-auth';

export const candidateRoutes = new Hono<{ Bindings: Env; Variables: VoterVariables }>();

candidateRoutes.use('*', requireVoter);

candidateRoutes.get('/invitations', async (c) => {
  const voter = c.get('voter');
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const invitations = await listPendingInvitations(c.env, election.id, voter.sub);
  return c.json({ ok: true, electionId: election.id, invitations });
});

async function respondToNomination(
  c: Context<{ Bindings: Env; Variables: VoterVariables }>,
  action: 'accept' | 'decline',
) {
  const voter = c.get('voter');
  const body = await c.req.json().catch(() => null);
  const parsed = candidateResponseSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      400,
    );
  }

  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  if (parsed.data.electionId !== election.id) {
    return c.json({ ok: false, error: 'Invalid election' }, 400);
  }

  const candidate = await getCandidateForMember(
    c.env,
    election.id,
    parsed.data.candidateId,
    voter.sub,
  );

  if (!candidate) {
    return c.json({ ok: false, error: 'Nomination not found' }, 404);
  }

  const ctx = {
    phase: election.phase,
    candidateStatus: candidate.status,
    candidateMemberId: candidate.member_id,
    voterMemberId: voter.sub,
  };

  const validation =
    action === 'accept' ? validateCandidateAccept(ctx) : validateCandidateDecline(ctx);

  if (!validation.ok) {
    return c.json({ ok: false, error: validation.error }, 400);
  }

  const nextStatus = action === 'accept' ? 'pending_approval' : 'declined';
  const result = await updateCandidateStatus(c.env, candidate.id, voter.sub, nextStatus);

  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'member',
    actorId: voter.licenseHash,
    action: action === 'accept' ? 'candidate.accept' : 'candidate.decline',
    entity: 'candidate',
    entityId: candidate.id,
    payload: { electionId: election.id },
  });

  return c.json({
    ok: true,
    candidateId: candidate.id,
    status: nextStatus,
    message:
      action === 'accept'
        ? 'You have accepted this nomination. It is now pending ELECOM approval.'
        : 'You have declined this nomination.',
  });
}

candidateRoutes.post('/accept', async (c) => respondToNomination(c, 'accept'));
candidateRoutes.post('/decline', async (c) => respondToNomination(c, 'decline'));
