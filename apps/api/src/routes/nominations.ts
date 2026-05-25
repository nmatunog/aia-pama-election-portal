import { Hono } from 'hono';
import {
  nationalNominationSchema,
  zonalNominationSchema,
  validateNationalNomination,
  validateZonalNomination,
  type NominationMember,
  type NominationValidationContext,
} from '@aia-pama/shared';
import type { Env } from '../env';
import { getCurrentElection } from '../lib/supabase-election';
import { findMemberById, findMembersByIds, searchMembers } from '../lib/supabase-members';
import {
  appendAuditLog,
  getNominationLimits,
  isCandidateAlreadyNominated,
  listMyNominations,
  submitNominationPackage,
} from '../lib/supabase-nominations';
import { findMemberByLicenseHash } from '../lib/supabase';
import { requireVoter, type VoterVariables } from '../middleware/voter-auth';

export const nominationRoutes = new Hono<{ Bindings: Env; Variables: VoterVariables }>();

nominationRoutes.use('*', requireVoter);

function toNominationMember(row: {
  id: string;
  zone: string;
  good_standing: boolean;
  active: boolean;
}): NominationMember {
  return {
    id: row.id,
    zone: row.zone,
    goodStanding: row.good_standing,
    active: row.active,
  };
}

async function buildValidationContext(
  env: Env,
  electionId: string,
  phase: string,
  nominatorLicenseHash: string,
  nominator: NominationMember,
  candidate: NominationMember,
  endorsers: NominationMember[],
): Promise<NominationValidationContext> {
  const limits = await getNominationLimits(
    env,
    electionId,
    phase,
    nominatorLicenseHash,
    String(nominator.zone),
  );

  const [candidateAlreadyNominatedZonal, candidateAlreadyNominatedNational] =
    await Promise.all([
      isCandidateAlreadyNominated(env, electionId, candidate.id, 'zonal'),
      isCandidateAlreadyNominated(env, electionId, candidate.id, 'national'),
    ]);

  return {
    phase: phase as NominationValidationContext['phase'],
    nominator,
    candidate,
    endorsers,
    nominatorZonalCount: limits.nominatorZonalCount,
    nominatorNationalCount: limits.nominatorNationalCount,
    zonalCandidatesInZone: limits.zonalCandidatesInZone,
    nationalCandidatesCount: limits.nationalCandidatesCount,
    candidateAlreadyNominatedZonal,
    candidateAlreadyNominatedNational,
  };
}

nominationRoutes.get('/limits', async (c) => {
  const voter = c.get('voter');
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const limits = await getNominationLimits(
    c.env,
    election.id,
    election.phase,
    voter.licenseHash,
    voter.zone,
  );

  return c.json({ ok: true, ...limits });
});

nominationRoutes.get('/mine', async (c) => {
  const voter = c.get('voter');
  const election = await getCurrentElection(c.env);
  if (!election) {
    return c.json({ ok: false, error: 'No active election' }, 404);
  }

  const nominations = await listMyNominations(c.env, election.id, voter.licenseHash);
  return c.json({ ok: true, nominations });
});

nominationRoutes.get('/members/search', async (c) => {
  const voter = c.get('voter');
  const q = c.req.query('q') ?? '';
  const type = c.req.query('type') ?? 'zonal';
  const zoneParam = c.req.query('zone');

  const zone =
    type === 'zonal' ? voter.zone : zoneParam && zoneParam.length > 0 ? zoneParam : undefined;

  if (type === 'zonal' && zone !== voter.zone) {
    return c.json({ ok: false, error: 'You may only search members in your zone' }, 403);
  }

  const members = await searchMembers(c.env, { zone, query: q, limit: 25 });
  return c.json({ ok: true, members });
});

nominationRoutes.post('/zonal', async (c) => {
  const voter = c.get('voter');
  const body = await c.req.json().catch(() => null);
  const parsed = zonalNominationSchema.safeParse(body);

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

  const nominatorRow = await findMemberByLicenseHash(c.env, voter.licenseHash);
  if (!nominatorRow || nominatorRow.id !== voter.sub) {
    return c.json({ ok: false, error: 'Nominator not found' }, 404);
  }

  const candidateRow = await findMemberById(c.env, parsed.data.candidateMemberId);
  if (!candidateRow) {
    return c.json({ ok: false, error: 'Candidate not found' }, 404);
  }

  const endorserRows = await findMembersByIds(c.env, parsed.data.endorserMemberIds);
  const nominator = toNominationMember(nominatorRow);
  const candidate = toNominationMember(candidateRow);
  const endorsers = endorserRows.map(toNominationMember);

  const ctx = await buildValidationContext(
    c.env,
    election.id,
    election.phase,
    voter.licenseHash,
    nominator,
    candidate,
    endorsers,
  );

  const validation = validateZonalNomination(
    {
      candidateMemberId: parsed.data.candidateMemberId,
      endorserMemberIds: parsed.data.endorserMemberIds,
    },
    ctx,
  );

  if (!validation.ok) {
    return c.json({ ok: false, error: validation.error }, 400);
  }

  const endorserHashes = endorserRows.map((r) => r.license_code_hash);
  const result = await submitNominationPackage(c.env, {
    electionId: election.id,
    type: 'zonal',
    zone: candidate.zone,
    candidateMemberId: candidate.id,
    nominatorLicenseHash: voter.licenseHash,
    endorserLicenseHashes: endorserHashes,
  });

  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'member',
    actorId: voter.licenseHash,
    action: 'nomination.zonal',
    entity: 'nomination',
    entityId: result.nominationId,
    payload: {
      candidateMemberId: candidate.id,
      zone: voter.zone,
      endorserCount: endorserHashes.length,
    },
  });

  return c.json({
    ok: true,
    candidateId: result.candidateId,
    nominationId: result.nominationId,
    message: 'Zonal nomination submitted. The candidate must accept before ELECOM review.',
  });
});

nominationRoutes.post('/national', async (c) => {
  const voter = c.get('voter');
  const body = await c.req.json().catch(() => null);
  const parsed = nationalNominationSchema.safeParse(body);

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

  const nominatorRow = await findMemberByLicenseHash(c.env, voter.licenseHash);
  if (!nominatorRow || nominatorRow.id !== voter.sub) {
    return c.json({ ok: false, error: 'Nominator not found' }, 404);
  }

  const candidateRow = await findMemberById(c.env, parsed.data.candidateMemberId);
  if (!candidateRow) {
    return c.json({ ok: false, error: 'Candidate not found' }, 404);
  }

  const endorserRows = await findMembersByIds(c.env, parsed.data.endorserMemberIds);
  const nominator = toNominationMember(nominatorRow);
  const candidate = toNominationMember(candidateRow);
  const endorsers = endorserRows.map(toNominationMember);

  const ctx = await buildValidationContext(
    c.env,
    election.id,
    election.phase,
    voter.licenseHash,
    nominator,
    candidate,
    endorsers,
  );

  const validation = validateNationalNomination(
    {
      candidateMemberId: parsed.data.candidateMemberId,
      endorserMemberIds: parsed.data.endorserMemberIds,
    },
    ctx,
  );

  if (!validation.ok) {
    return c.json({ ok: false, error: validation.error }, 400);
  }

  const endorserHashes = endorserRows.map((r) => r.license_code_hash);
  const result = await submitNominationPackage(c.env, {
    electionId: election.id,
    type: 'national',
    zone: null,
    candidateMemberId: candidate.id,
    nominatorLicenseHash: voter.licenseHash,
    endorserLicenseHashes: endorserHashes,
  });

  if ('error' in result) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  await appendAuditLog(c.env, {
    actorType: 'member',
    actorId: voter.licenseHash,
    action: 'nomination.national',
    entity: 'nomination',
    entityId: result.nominationId,
    payload: {
      candidateMemberId: candidate.id,
      endorserCount: endorserHashes.length,
    },
  });

  return c.json({
    ok: true,
    candidateId: result.candidateId,
    nominationId: result.nominationId,
    message: 'National nomination submitted. The candidate must accept before ELECOM review.',
  });
});
