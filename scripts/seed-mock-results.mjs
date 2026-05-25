#!/usr/bin/env node
/**
 * Seed mock ballots and vote totals for ELECOM / public results testing.
 *
 * Usage:
 *   npm run seed:mock-results              # --reset + canvassing (recommended)
 *   node scripts/seed-mock-results.mjs --reset
 *   node scripts/seed-mock-results.mjs --phase certified
 *
 * Requires: .env.local (service role), npm run seed:members, active election.
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ZONES = [
  'North Central Luzon',
  'South Central Luzon',
  'Manila 1',
  'Manila 2',
  'Visayas',
  'Mindanao',
];

/** [leader votes, runner-up votes] per zone */
const ZONAL_VOTE_SPLIT = [12, 5];

/** National directors (top vote getters) */
const NATIONAL_VOTE_TARGETS = [28, 24, 20, 16, 12];

function hashLicenseCode(licenseCode) {
  return createHash('sha256').update(licenseCode.trim(), 'utf8').digest('hex');
}

function loadEnvLocal() {
  const text = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = val;
  }
  return env;
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sb(env, path, options = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    ...options,
    headers: headers(env.key, options.prefer ? { Prefer: options.prefer } : {}),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

async function getElection(env) {
  const { ok, data } = await sb(
    env,
    'elections?select=id,cycle_year,phase&order=created_at.desc&limit=1',
  );
  if (!ok || !data?.[0]) throw new Error('No election row — run npm run seed:election');
  return data[0];
}

async function setPhase(env, electionId, phase) {
  const { ok, status, data } = await sb(env, `elections?id=eq.${electionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ phase, updated_at: new Date().toISOString() }),
    prefer: 'return=minimal',
  });
  if (!ok) throw new Error(`Phase update failed: ${status} ${JSON.stringify(data)}`);
}

async function resetBallots(env, electionId) {
  const part = await sb(
    env,
    `voter_participation?election_id=eq.${electionId}`,
    { method: 'DELETE', prefer: 'return=minimal' },
  );
  if (!part.ok) console.warn('Clear participation:', part.status);

  const ballots = await sb(env, `ballots?election_id=eq.${electionId}&select=id`);
  const ids = (ballots.data ?? []).map((b) => b.id);
  if (ids.length === 0) return 0;

  const inList = ids.join(',');
  await sb(env, `ballot_votes?ballot_id=in.(${inList})`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  await sb(env, `ballots?id=in.(${inList})`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  return ids.length;
}

async function loadMembers(env) {
  const { ok, data } = await sb(
    env,
    'members?select=id,full_name,zone,license_code_hash&good_standing=eq.true&active=eq.true&order=full_name.asc',
  );
  if (!ok) throw new Error('Could not load members');
  return data ?? [];
}

async function loadCandidates(env, electionId) {
  const { ok, data } = await sb(
    env,
    `candidates?election_id=eq.${electionId}&select=id,member_id,type,zone,status,members(full_name)`,
  );
  if (!ok) throw new Error('Could not load candidates');
  return data ?? [];
}

async function upsertApprovedCandidate(env, electionId, memberId, type, zone) {
  const existing = await sb(
    env,
    `candidates?election_id=eq.${electionId}&member_id=eq.${memberId}&select=id,status`,
  );
  const row = existing.data?.[0];
  if (row) {
    if (row.status !== 'approved') {
      await sb(env, `candidates?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', rejection_reason: null }),
        prefer: 'return=minimal',
      });
    }
    return row.id;
  }

  const created = await sb(env, 'candidates', {
    method: 'POST',
    body: JSON.stringify({
      election_id: electionId,
      member_id: memberId,
      type,
      zone: type === 'zonal' ? zone : null,
      status: 'approved',
    }),
    prefer: 'return=representation',
  });
  if (!created.ok) {
    throw new Error(`Create candidate failed: ${created.status} ${JSON.stringify(created.data)}`);
  }
  return created.data[0].id;
}

async function ensureMockRoster(env, electionId, members) {
  const existing = await loadCandidates(env, electionId);
  const usedMemberIds = new Set(existing.map((c) => c.member_id));

  const byZone = new Map();
  for (const z of ZONES) byZone.set(z, []);
  for (const m of members) {
    const list = byZone.get(m.zone) ?? [];
    list.push(m);
    byZone.set(m.zone, list);
  }

  const zonalIds = [];
  for (const zone of ZONES) {
    const approvedInZone = existing
      .filter((c) => c.status === 'approved' && c.type === 'zonal' && c.zone === zone)
      .map((c) => ({
        id: c.id,
        zone,
        name: c.members?.full_name ?? 'Candidate',
      }));

    if (approvedInZone.length >= 2) {
      zonalIds.push(...approvedInZone.slice(0, 2));
      continue;
    }

    const pool = (byZone.get(zone) ?? []).filter((m) => !usedMemberIds.has(m.id));
    for (let i = approvedInZone.length; i < 2 && i < pool.length + approvedInZone.length; i++) {
      if (approvedInZone[i]) {
        zonalIds.push(approvedInZone[i]);
        continue;
      }
      const m = pool[i - approvedInZone.length];
      if (!m) break;
      const id = await upsertApprovedCandidate(env, electionId, m.id, 'zonal', zone);
      usedMemberIds.add(m.id);
      zonalIds.push({ id, zone, name: m.full_name });
    }
    zonalIds.push(...approvedInZone);
  }

  let nationalIds = existing
    .filter((c) => c.status === 'approved' && c.type === 'national')
    .map((c) => ({ id: c.id, name: c.members?.full_name ?? 'Candidate' }));

  if (nationalIds.length < 5) {
    const pool = members.filter((m) => !usedMemberIds.has(m.id));
    for (const m of pool) {
      if (nationalIds.length >= 5) break;
      const id = await upsertApprovedCandidate(env, electionId, m.id, 'national', null);
      usedMemberIds.add(m.id);
      nationalIds.push({ id, name: m.full_name });
    }
  }
  nationalIds = nationalIds.slice(0, 5);

  return { zonalIds, nationalIds, byZone };
}

async function insertBallot(env, electionId, voterHash, zonalCandidateId, nationalCandidateIds) {
  const ballotRes = await sb(env, 'ballots', {
    method: 'POST',
    body: JSON.stringify({
      election_id: electionId,
      receipt_token: randomUUID(),
    }),
    prefer: 'return=representation',
  });
  if (!ballotRes.ok) throw new Error(`Ballot insert failed: ${ballotRes.status}`);
  const ballotId = ballotRes.data[0].id;

  const votes = [
    { ballot_id: ballotId, candidate_id: zonalCandidateId, vote_type: 'zonal' },
    ...nationalCandidateIds.map((candidate_id) => ({
      ballot_id: ballotId,
      candidate_id,
      vote_type: 'national',
    })),
  ];

  const votesRes = await sb(env, 'ballot_votes', {
    method: 'POST',
    body: JSON.stringify(votes),
    prefer: 'return=minimal',
  });
  if (!votesRes.ok) {
    throw new Error(`ballot_votes failed: ${votesRes.status} ${JSON.stringify(votesRes.data)}`);
  }

  const partRes = await sb(env, 'voter_participation', {
    method: 'POST',
    body: JSON.stringify({
      election_id: electionId,
      voter_license_hash: voterHash,
      ballot_id: ballotId,
    }),
    prefer: 'return=minimal',
  });
  if (!partRes.ok) {
    throw new Error(`participation failed: ${partRes.status} ${JSON.stringify(partRes.data)}`);
  }
}

function pickNationals(nationalIds, leaderIdx, count) {
  const ids = nationalIds.map((n) => n.id);
  const picked = new Set([ids[leaderIdx % ids.length]]);
  let i = 0;
  while (picked.size < count && picked.size < ids.length) {
    picked.add(ids[(leaderIdx + i) % ids.length]);
    i++;
  }
  return [...picked];
}

async function seedMockBallots(env, electionId, zonalIds, nationalIds, byZone) {
  const zonalByZone = new Map();
  for (const z of ZONES) zonalByZone.set(z, []);
  const seenZonal = new Set();
  for (const c of zonalIds) {
    if (seenZonal.has(c.id)) continue;
    seenZonal.add(c.id);
    const list = zonalByZone.get(c.zone) ?? [];
    list.push(c);
    zonalByZone.set(c.zone, list);
  }

  const votersUsed = new Set();
  let ballotsCreated = 0;

  for (const zone of ZONES) {
    const zoneCandidates = zonalByZone.get(zone) ?? [];
    if (zoneCandidates.length === 0) continue;

    const voters = (byZone.get(zone) ?? []).filter((v) => !votersUsed.has(v.id));
    let voterIdx = 0;

    for (let cIdx = 0; cIdx < zoneCandidates.length; cIdx++) {
      const candidate = zoneCandidates[cIdx];
      const voteTarget = ZONAL_VOTE_SPLIT[cIdx] ?? 4;

      for (let v = 0; v < voteTarget && voterIdx < voters.length; v++) {
        const voter = voters[voterIdx++];
        votersUsed.add(voter.id);
        await insertBallot(
          env,
          electionId,
          voter.license_code_hash,
          candidate.id,
          pickNationals(nationalIds, ballotsCreated, 3),
        );
        ballotsCreated++;
      }
    }
  }

  const extraVoters = [];
  for (const zone of ZONES) {
    for (const m of byZone.get(zone) ?? []) {
      if (!votersUsed.has(m.id)) extraVoters.push({ ...m, zone });
    }
  }

  for (let nIdx = 0; nIdx < nationalIds.length; nIdx++) {
    const target = NATIONAL_VOTE_TARGETS[nIdx] ?? 10;
    const candidateId = nationalIds[nIdx].id;
    let added = 0;
    let cursor = 0;

    while (added < target && cursor < extraVoters.length * 2) {
      const voter = extraVoters[cursor % extraVoters.length];
      cursor++;
      if (votersUsed.has(voter.id)) continue;

      const zoneCands = zonalByZone.get(voter.zone) ?? [];
      if (zoneCands.length === 0) continue;

      votersUsed.add(voter.id);
      const nationals = pickNationals(nationalIds, nIdx, 4);
      if (!nationals.includes(candidateId)) nationals[0] = candidateId;

      await insertBallot(
        env,
        electionId,
        voter.license_code_hash,
        zoneCands[0].id,
        nationals,
      );
      ballotsCreated++;
      added++;
    }
  }

  return ballotsCreated;
}

async function printSummary(env, electionId) {
  const turnout = await sb(
    env,
    `public_turnout_v?election_id=eq.${electionId}&select=total_voted`,
  );

  const results = await sb(
    env,
    `candidates?election_id=eq.${electionId}&status=eq.approved&select=id,type,zone,members(full_name)`,
  );
  const votes = await sb(
    env,
    `ballot_votes?select=candidate_id,candidates!inner(election_id,type,zone,members(full_name))&candidates.election_id=eq.${electionId}`,
  );

  const counts = new Map();
  if (votes.ok && Array.isArray(votes.data)) {
    for (const row of votes.data) {
      const id = row.candidate_id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  console.log('\n--- Mock results summary ---');
  console.log('Turnout:', turnout.data?.[0]?.total_voted ?? '?');

  if (results.ok && Array.isArray(results.data)) {
    console.log('\nZonal (by zone):');
    for (const zone of ZONES) {
      const rows = results.data.filter((c) => c.type === 'zonal' && c.zone === zone);
      if (rows.length === 0) continue;
      console.log(`  ${zone}:`);
      for (const c of rows) {
        const n = counts.get(c.id) ?? 0;
        console.log(`    ${c.members?.full_name}: ${n}`);
      }
    }
    console.log('\nNational:');
    const national = results.data
      .filter((c) => c.type === 'national')
      .map((c) => ({ name: c.members?.full_name, n: counts.get(c.id) ?? 0 }))
      .sort((a, b) => b.n - a.n);
    for (const r of national) {
      console.log(`  ${r.name}: ${r.n}`);
    }
  }

  console.log('\nView: http://localhost:3000/admin  and  http://localhost:3000/candidates');
}

async function main() {
  const args = process.argv.slice(2);
  const doReset = args.includes('--reset') || args.length === 0;
  const phaseIdx = args.indexOf('--phase');
  const phaseArg =
    phaseIdx >= 0 && args[phaseIdx + 1] ? args[phaseIdx + 1] : 'canvassing';

  const raw = loadEnvLocal();
  const env = {
    url: raw.NEXT_PUBLIC_SUPABASE_URL,
    key: raw.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!env.url || !env.key) {
    throw new Error('Missing Supabase URL or service role key in .env.local');
  }

  console.log('Mock election results seed\n');

  const election = await getElection(env);
  console.log(`Election: ${election.cycle_year} (${election.id})`);

  if (doReset) {
    const cleared = await resetBallots(env, election.id);
    console.log(`Cleared ${cleared} existing ballot(s).`);
  }

  const members = await loadMembers(env);
  if (members.length < 20) {
    throw new Error('Too few members — run: npm run seed:members');
  }

  const { zonalIds, nationalIds, byZone } = await ensureMockRoster(env, election.id, members);
  const uniqueZonal = [...new Map(zonalIds.map((c) => [c.id, c])).values()];
  console.log(
    `Approved roster: ${uniqueZonal.length} zonal, ${nationalIds.length} national candidates`,
  );

  const created = await seedMockBallots(
    env,
    election.id,
    uniqueZonal,
    nationalIds,
    byZone,
  );
  console.log(`Created ${created} mock ballot(s).`);

  await setPhase(env, election.id, phaseArg);
  console.log(`Election phase set to: ${phaseArg}`);

  await printSummary(env, election.id);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
