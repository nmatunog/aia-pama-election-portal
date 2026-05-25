#!/usr/bin/env node
/**
 * Integration test for Phase 4: voting ballot submit.
 * Requires: npm run dev:api, seeded members + election, at least one approved zonal candidate.
 * Sets election phase to voting via ELECOM admin API when credentials are configured.
 */

const API = process.env.API_URL ?? 'http://localhost:8787';
const ELECTION_ID = process.env.ELECTION_ID ?? 'd837db00-e73f-4a21-b12e-c0edaa91ff0f';
const VOTER = { license: '007264061', name: 'Grace Torres' };
const ADMIN_EMAIL = process.env.ELECOM_ADMIN_EMAIL ?? 'nmatunog@gmail.com';
const ADMIN_PASSWORD = process.env.ELECOM_ADMIN_PASSWORD ?? 'elecom-dev-2026';

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.error(`  ✖ ${label}`);
  if (detail) console.error(`    ${detail}`);
}

async function login(license) {
  const otpRes = await fetch(`${API}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseCode: license, contact: 'test@example.com' }),
  });
  const otpData = await otpRes.json();
  if (!otpData.ok || !otpData.devOtp) {
    throw new Error(`request-otp failed: ${JSON.stringify(otpData)}`);
  }
  const verifyRes = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseCode: license,
      otp: otpData.devOtp,
      sessionId: otpData.sessionId,
    }),
  });
  const body = await verifyRes.json();
  if (!verifyRes.ok || !body.ok || !body.token) {
    throw new Error(`verify-otp failed: ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function adminToken() {
  const res = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.ok || !data.token) {
    throw new Error(`admin login failed: ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function setPhaseVoting() {
  const token = await adminToken();
  const res = await fetch(`${API}/admin/election/phase`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ electionId: ELECTION_ID, phase: 'voting' }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`phase patch failed: ${JSON.stringify(data)}`);
}

async function main() {
  console.log('Phase 4 — voting ballot\n');

  try {
    await setPhaseVoting();
    ok('ELECOM set election phase to voting');
  } catch (e) {
    fail('Set phase to voting', e.message);
    console.error('\nEnsure ELECOM_ADMIN_EMAIL/PASSWORD in apps/api/.dev.vars');
    process.exit(1);
  }

  let token;
  try {
    token = await login(VOTER.license);
    ok(`Voter login (${VOTER.name})`);
  } catch (e) {
    fail('Voter login', e.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  const optionsRes = await fetch(`${API}/ballots/options`, { headers });
  const options = await optionsRes.json();
  if (!options.ok) {
    fail('GET /ballots/options', JSON.stringify(options));
    process.exit(1);
  }
  ok(`Ballot options loaded (${options.zonal?.length ?? 0} zonal, ${options.national?.length ?? 0} national)`);

  if ((options.zonal?.length ?? 0) === 0) {
    fail('Need approved zonal candidate in voter zone', `Voter zone must match an approved zonal candidate`);
    process.exit(1);
  }

  const zonalId = options.zonal[0].id;
  const nationalIds = (options.national ?? []).slice(0, 2).map((c) => c.id);

  const submitRes = await fetch(`${API}/ballots/submit`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      electionId: ELECTION_ID,
      zonalVote: { candidateId: zonalId },
      nationalVotes: { candidateIds: nationalIds },
      turnstileToken: 'dev-bypass',
    }),
  });
  const submit = await submitRes.json();
  if (!submit.ok || !submit.receiptToken) {
    fail('POST /ballots/submit', JSON.stringify(submit));
  } else {
    ok(`Ballot submitted (receipt ${submit.receiptToken.slice(0, 8)}…)`);
  }

  const dupRes = await fetch(`${API}/ballots/submit`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      electionId: ELECTION_ID,
      zonalVote: { candidateId: zonalId },
      nationalVotes: { candidateIds: nationalIds },
      turnstileToken: 'dev-bypass',
    }),
  });
  const dup = await dupRes.json();
  if (dupRes.status === 409 || (dup.ok === false && dup.error?.includes('already'))) {
    ok('Duplicate vote rejected');
  } else {
    fail('Duplicate vote should be rejected', JSON.stringify(dup));
  }

  const statusRes = await fetch(`${API}/ballots/status`, { headers });
  const status = await statusRes.json();
  if (status.ok && status.hasVoted) {
    ok('GET /ballots/status shows hasVoted');
  } else {
    fail('Ballot status', JSON.stringify(status));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
