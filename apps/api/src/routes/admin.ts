import { Hono } from 'hono';
import {
  buildDefaultDevRoster,
  candidateReviewSchema,
  candidateStatusUpdateSchema,
  electionCertifySchema,
  electionPhaseUpdateSchema,
  elecomLoginSchema,
  assertCanCertifyElection,
  type ElectionPhase,
  memberApprovalSchema,
  memberDeleteSchema,
  memberUpdateSchema,
  newElectionCycleSchema,
  rosterImportSchema,
} from '@aia-pama/shared';
import type { Env } from '../env';
import { verifyElecomCredentials } from '../lib/elecom-auth-config';
import { signElecomToken } from '../lib/jwt';
import { appendAuditLog } from '../lib/supabase-nominations';
import {
  getCandidateStatusCounts,
  getElectionOverview,
  listCandidates,
  listNominations,
  listPendingApprovalCandidates,
  listQualifiedVoters,
  reviewCandidate,
  updateCandidateStatus,
  updateElectionPhase,
  updateMember,
} from '../lib/supabase-admin';
import { certifyElectionRecord } from '../lib/supabase-election';
import { getCertifiedElectionResults } from '../lib/supabase-certified';
import { loadPublicResults } from '../lib/supabase-public';
import {
  deleteMemberRecord,
  importMemberRoster,
  listMembers,
  reviewMemberSignup,
} from '../lib/supabase-members';
import {
  resetCurrentElection,
  startNewElectionCycle,
} from '../lib/supabase-election-cycle';
import { requireElecom, type ElecomVariables } from '../middleware/elecom-auth';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: ElecomVariables }>();

adminRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = elecomLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      400,
    );
  }

  const verified = verifyElecomCredentials(
    c.env,
    parsed.data.email,
    parsed.data.password,
  );
  if (!verified.ok) {
    return c.json({ ok: false, error: verified.error }, 401);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ ok: false, error: 'Server misconfigured' }, 500);
  }

  const token = await signElecomToken(
    { sub: `elecom:${verified.email}`, email: verified.email, role: 'elecom' },
    secret,
  );

  return c.json({
    ok: true,
    token,
    admin: { email: verified.email, role: 'elecom' },
  });
});

adminRoutes.use('*', requireElecom);

adminRoutes.get('/overview', async (c) => {
  const election = await getElectionOverview(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No election configured' }, 404);
  }

  const counts = await getCandidateStatusCounts(c.env, election.id);
  const pending = await listPendingApprovalCandidates(c.env, election.id);
  const voterStats = await listQualifiedVoters(c.env, election.id);

  const showResults = ['voting', 'canvassing', 'certified'].includes(election.phase);
  const rawResults = showResults
    ? await loadPublicResults(c.env, election.id)
    : [];

  const results = rawResults.map((r) => ({
    candidateId: r.candidate_id,
    fullName: r.full_name,
    type: r.type,
    zone: r.zone,
    voteCount: Number(r.vote_count) || 0,
  }));

  const certified =
    showResults ? await getCertifiedElectionResults(c.env, election.id) : null;

  return c.json({
    ok: true,
    election,
    candidateCounts: counts,
    pendingApproval: pending,
    voterStats: voterStats.stats,
    nominationCount: (await listNominations(c.env, election.id)).length,
    results,
    showResults,
    certified,
  });
});

adminRoutes.get('/candidates', async (c) => {
  const election = await getElectionOverview(c.env);
  if (!election) return c.json({ ok: false, error: 'No election' }, 404);

  const status = c.req.query('status') ?? 'all';
  const candidates = await listCandidates(c.env, election.id, status);

  return c.json({ ok: true, electionId: election.id, candidates });
});

adminRoutes.get('/nominations', async (c) => {
  const election = await getElectionOverview(c.env);
  if (!election) return c.json({ ok: false, error: 'No election' }, 404);

  const nominations = await listNominations(c.env, election.id);
  return c.json({ ok: true, electionId: election.id, nominations });
});

adminRoutes.get('/voters', async (c) => {
  const election = await getElectionOverview(c.env);
  if (!election) return c.json({ ok: false, error: 'No election' }, 404);

  const zone = c.req.query('zone');
  const { voters, stats } = await listQualifiedVoters(c.env, election.id, zone);

  return c.json({ ok: true, electionId: election.id, voters, stats });
});

adminRoutes.post('/election/certify', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = electionCertifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const election = await getElectionOverview(c.env);
  if (!election || election.id !== parsed.data.electionId) {
    return c.json({ ok: false, error: 'Invalid election' }, 400);
  }

  const canCertify = assertCanCertifyElection(election.phase as ElectionPhase);
  if (!canCertify.ok) {
    return c.json({ ok: false, error: canCertify.error }, 400);
  }

  const { stats } = await listQualifiedVoters(c.env, election.id);
  if (stats.voted === 0) {
    return c.json(
      { ok: false, error: 'Cannot certify — no ballots have been cast' },
      400,
    );
  }

  const certified = await getCertifiedElectionResults(c.env, election.id);
  if (certified.zonalWinners.length === 0) {
    return c.json(
      { ok: false, error: 'Cannot certify — no zonal results to certify' },
      400,
    );
  }

  const certRecord = await certifyElectionRecord(c.env, election.id);
  if ('error' in certRecord) {
    return c.json({ ok: false, error: certRecord.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'election.certify',
    entity: 'election',
    entityId: election.id,
    payload: {
      certifiedAt: certRecord.certifiedAt,
      turnout: stats.voted,
      zonalWinners: certified.zonalWinners.length,
      nationalSeated: certified.nationalBoard.filter((s) => s.seated).length,
    },
  });

  return c.json({
    ok: true,
    message:
      'Election results certified. The official announcement is now published on every member dashboard.',
    certifiedAt: certRecord.certifiedAt,
    election: {
      id: election.id,
      cycle_year: election.cycle_year,
      phase: 'certified',
      certified_at: certRecord.certifiedAt,
    },
    turnout: stats.voted,
    ...certified,
  });
});

adminRoutes.patch('/election/phase', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = electionPhaseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await updateElectionPhase(
    c.env,
    parsed.data.electionId,
    parsed.data.phase,
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'election.phase',
    entity: 'election',
    entityId: parsed.data.electionId,
    payload: { phase: parsed.data.phase },
  });

  return c.json({ ok: true, phase: parsed.data.phase });
});

adminRoutes.patch('/candidates/status', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = candidateStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await updateCandidateStatus(
    c.env,
    parsed.data.electionId,
    parsed.data.candidateId,
    parsed.data.status,
    parsed.data.rejectionReason,
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'candidate.status',
    entity: 'candidate',
    entityId: parsed.data.candidateId,
    payload: {
      status: parsed.data.status,
      electionId: parsed.data.electionId,
    },
  });

  return c.json({ ok: true, status: parsed.data.status });
});

adminRoutes.patch('/members', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = memberUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await updateMember(c.env, parsed.data.memberId, {
    goodStanding: parsed.data.goodStanding,
    active: parsed.data.active,
    position: parsed.data.position,
    agencyName: parsed.data.agencyName,
    isElecom: parsed.data.isElecom,
  });
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'member.update',
    entity: 'member',
    entityId: parsed.data.memberId,
    payload: {
      goodStanding: parsed.data.goodStanding,
      active: parsed.data.active,
      position: parsed.data.position ?? null,
      agencyName: parsed.data.agencyName ?? null,
      isElecom: parsed.data.isElecom ?? null,
    },
  });

  return c.json({ ok: true });
});

adminRoutes.post('/candidates/approve', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = candidateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await reviewCandidate(
    c.env,
    parsed.data.candidateId,
    parsed.data.electionId,
    'approved',
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'candidate.approve',
    entity: 'candidate',
    entityId: parsed.data.candidateId,
    payload: { electionId: parsed.data.electionId },
  });

  return c.json({ ok: true, status: 'approved', message: 'Candidate approved for the ballot.' });
});

adminRoutes.post('/candidates/reject', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = candidateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await reviewCandidate(
    c.env,
    parsed.data.candidateId,
    parsed.data.electionId,
    'rejected',
    parsed.data.rejectionReason,
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'candidate.reject',
    entity: 'candidate',
    entityId: parsed.data.candidateId,
    payload: {
      electionId: parsed.data.electionId,
      reason: parsed.data.rejectionReason ?? null,
    },
  });

  return c.json({ ok: true, status: 'rejected', message: 'Candidate not approved.' });
});

adminRoutes.get('/members/applications', async (c) => {
  const pending = await listMembers(c.env, { approvalStatus: 'pending_approval' });
  return c.json({
    ok: true,
    applications: pending.map((m) => ({
      memberId: m.id,
      fullName: m.full_name,
      position: m.position,
      agencyName: m.agency_name,
      zone: m.zone,
      contactEmail: m.contact_email,
      registeredAt: m.registered_at,
    })),
  });
});

adminRoutes.post('/members/approve', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = memberApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await reviewMemberSignup(
    c.env,
    parsed.data.memberId,
    parsed.data.decision,
    parsed.data.rejectionReason,
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: `member.${parsed.data.decision}`,
    entity: 'member',
    entityId: parsed.data.memberId,
    payload: { rejectionReason: parsed.data.rejectionReason ?? null },
  });

  return c.json({
    ok: true,
    message:
      parsed.data.decision === 'approved'
        ? 'Member approved and may now log in.'
        : 'Member application rejected.',
  });
});

adminRoutes.post('/members/delete', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = memberDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await deleteMemberRecord(c.env, parsed.data.memberId);
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'member.delete',
    entity: 'member',
    entityId: parsed.data.memberId,
    payload: {},
  });

  return c.json({ ok: true, message: 'Member removed from roster.' });
});

adminRoutes.post('/members/import-roster', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = rosterImportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await importMemberRoster(
    c.env,
    parsed.data.members.map((m) => ({
      licenseCode: m.licenseCode,
      fullName: m.fullName,
      zone: m.zone,
      goodStanding: m.goodStanding,
      active: m.active,
    })),
    { deactivateOthers: parsed.data.deactivateOthers ?? false },
  );
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'member.import_roster',
    entity: 'members',
    entityId: 'bulk',
    payload: { count: result.upserted, deactivated: result.deactivated },
  });

  return c.json({
    ok: true,
    upserted: result.upserted,
    deactivated: result.deactivated,
    message: `Imported ${result.upserted} member(s).`,
  });
});

adminRoutes.post('/members/import-dev-template', async (c) => {
  const elecom = c.get('elecom');
  const perZone = Number(c.req.query('perZone') ?? 15);
  const roster = buildDefaultDevRoster(perZone);
  const result = await importMemberRoster(c.env, roster, { deactivateOthers: false });
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'member.import_dev_template',
    entity: 'members',
    entityId: 'template',
    payload: { count: result.upserted, perZone },
  });

  return c.json({
    ok: true,
    upserted: result.upserted,
    message: `Imported ${result.upserted} members from dev template.`,
  });
});

adminRoutes.post('/election/new-cycle', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const parsed = newElectionCycleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }

  const result = await startNewElectionCycle(c.env, {
    cycleYear: parsed.data.cycleYear,
    force: parsed.data.force,
  });
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'election.new_cycle',
    entity: 'election',
    entityId: result.electionId,
    payload: {
      cycleYear: result.cycleYear,
      archivedElectionId: result.archivedElectionId ?? null,
    },
  });

  return c.json({
    ok: true,
    electionId: result.electionId,
    cycleYear: result.cycleYear,
    message: `New ${result.cycleYear} election cycle started in nomination phase.`,
  });
});

adminRoutes.post('/election/reset-current', async (c) => {
  const elecom = c.get('elecom');
  const body = await c.req.json().catch(() => null);
  const confirm = body?.confirm === true;
  if (!confirm) {
    return c.json({ ok: false, error: 'confirm: true required' }, 400);
  }

  const result = await resetCurrentElection(c.env);
  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 400);
  }

  await appendAuditLog(c.env, {
    actorType: 'elecom',
    actorId: elecom.email,
    action: 'election.reset_current',
    entity: 'election',
    entityId: 'current',
    payload: {},
  });

  return c.json({
    ok: true,
    message: 'Current election cleared and reset to nomination phase.',
  });
});
