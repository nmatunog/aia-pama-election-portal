#!/usr/bin/env node
/**
 * Integration test for Phase 3: candidate accept/decline.
 * Requires: npm run dev + npm run dev:api, seeded members + election.
 */

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const USE_WORKER = process.env.USE_WORKER === '1' || process.env.USE_WORKER === 'true';
const ELECTION_ID = process.env.ELECTION_ID ?? 'd837db00-e73f-4a21-b12e-c0edaa91ff0f';

const NOMINATOR = { license: '007264013', name: 'Nilo Matunog' };
const CANDIDATE = { license: '007264071', name: 'Ana Sy' };
const ENDORSER = { license: '007264061', name: 'Grace Torres' };

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

const authBase = USE_WORKER ? API : WEB;
const authOtpPath = USE_WORKER ? '/auth/request-otp' : '/api/auth/request-otp';
const authVerifyPath = USE_WORKER ? '/auth/verify-otp' : '/api/auth/verify-otp';

async function login(license, contact = 'test@example.com') {
  const otpRes = await fetch(`${authBase}${authOtpPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseCode: license, contact }),
  });
  const otpData = await otpRes.json();
  if (!otpData.ok || !otpData.devOtp) {
    throw new Error(`request-otp failed for ${license}: ${JSON.stringify(otpData)}`);
  }

  const verifyRes = await fetch(`${authBase}${authVerifyPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseCode: license,
      otp: otpData.devOtp,
      sessionId: otpData.sessionId,
    }),
  });
  const body = await verifyRes.json();
  if (!verifyRes.ok || !body.ok) {
    throw new Error(`verify-otp failed for ${license}: ${JSON.stringify(body)}`);
  }
  if (USE_WORKER && body.token) return body.token;
  const setCookie = verifyRes.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/aia_session=([^;]+)/);
  if (!match) {
    throw new Error(`verify-otp missing session cookie for ${license}`);
  }
  return match[1];
}

function authHeaders(token) {
  if (USE_WORKER) {
    return { Authorization: `Bearer ${token}` };
  }
  return { Cookie: `aia_session=${token}` };
}

const apiBase = USE_WORKER ? API : WEB;
const p = (path) => (USE_WORKER ? path.replace(/^\/api/, '') : path);

async function apiGet(path, token) {
  const res = await fetch(`${apiBase}${p(path)}`, {
    headers: authHeaders(token),
  });
  return { status: res.status, data: await res.json() };
}

async function apiPost(path, token, body) {
  const res = await fetch(`${apiBase}${p(path)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log('\nPhase 3 integration test\n');
  console.log(`Mode: ${USE_WORKER ? 'Worker API' : 'Next.js BFF'}`);
  console.log(`Web: ${WEB}`);
  console.log(`API: ${API}`);
  console.log(`Election: ${ELECTION_ID}\n`);

  const electionUrl = USE_WORKER
    ? `${API}/elections/current`
    : `${WEB}/api/elections/current`;
  let health;
  try {
    const res = await fetch(electionUrl);
    health = await res.json();
  } catch (err) {
    console.error('\n  API not reachable at', API);
    console.error('  Start the Worker first (in its own terminal):\n');
    console.error('    npm run dev:api\n');
    console.error('  Wait until you see Ready on http://localhost:8787, then run:\n');
    console.error('    npm run test:phase3\n');
    throw err;
  }
  if (!health.ok || health.election?.phase !== 'nomination') {
    fail('Election in nomination phase', JSON.stringify(health));
    process.exit(1);
  }
  ok(`Election phase: ${health.election.phase}`);

  let nominatorToken;
  let candidateToken;
  try {
    nominatorToken = await login(NOMINATOR.license);
    ok(`Login nominator (${NOMINATOR.name})`);
    candidateToken = await login(CANDIDATE.license);
    ok(`Login candidate (${CANDIDATE.name})`);
  } catch (e) {
    fail('Auth', e.message);
    process.exit(1);
  }

  const searchPath = USE_WORKER
    ? '/nominations/members/search?type=zonal&q=Ana'
    : '/api/members/search?type=zonal&q=Ana';
  const search = await apiGet(searchPath, nominatorToken);
  if (!search.data.ok || !search.data.members?.length) {
    fail('Member search', JSON.stringify(search.data));
  } else {
    ok(`Member search (${search.data.members.length} results)`);
  }

  const angela = search.data.members?.find((m) => m.full_name === CANDIDATE.name);
  const endorserPath = USE_WORKER
    ? '/nominations/members/search?type=zonal&q=Grace'
    : '/api/members/search?type=zonal&q=Grace';
  const endorserSearch = await apiGet(endorserPath, nominatorToken);
  const grace = endorserSearch.data.members?.find(
    (m) => m.full_name === ENDORSER.name && m.id !== angela?.id,
  );

  if (!angela?.id || !grace?.id) {
    fail('Resolve member IDs', `angela=${angela?.id} grace=${grace?.id}`);
  } else {
    const nomPath = USE_WORKER ? '/nominations/zonal' : '/api/nominations/zonal';
    const nom = await apiPost(nomPath, nominatorToken, {
      electionId: ELECTION_ID,
      candidateMemberId: angela.id,
      endorserMemberIds: [grace.id],
    });

    if (nom.data.ok) {
      ok(`Zonal nomination submitted → candidate ${nom.data.candidateId?.slice(0, 8)}…`);
    } else if (
      nom.data.error?.includes('already') ||
      nom.data.error?.includes('nominated') ||
      nom.status === 400
    ) {
      ok(`Nomination skipped (may already exist): ${nom.data.error}`);
    } else {
      fail('Submit zonal nomination', JSON.stringify(nom.data));
    }
  }

  const invPath = USE_WORKER ? '/candidates/invitations' : '/api/candidates/invitations';
  const inv = await apiGet(invPath, candidateToken);
  if (!inv.data.ok) {
    fail('List invitations', JSON.stringify(inv.data));
  } else {
    const count = inv.data.invitations?.length ?? 0;
    if (count === 0) {
      const minePath = USE_WORKER ? '/nominations/mine' : '/api/nominations/mine';
      const mine = await apiGet(minePath, nominatorToken);
      const alreadyAccepted = mine.data.nominations?.find(
        (n) =>
          n.candidates?.members?.full_name === CANDIDATE.name &&
          n.candidates?.status === 'pending_approval',
      );
      if (alreadyAccepted) {
        ok('Candidate already accepted (pending_approval) — Phase 3 flow verified earlier');
      } else {
        fail('Candidate has pending invitations', 'expected at least 1 or prior accept');
      }
    } else {
      ok(`Candidate invitations: ${count} pending`);
      const first = inv.data.invitations[0];
      const acceptPath = USE_WORKER ? '/candidates/accept' : '/api/candidates/accept';
      const accept = await apiPost(acceptPath, candidateToken, {
        electionId: ELECTION_ID,
        candidateId: first.candidateId,
      });

      if (accept.data.ok && accept.data.status === 'pending_approval') {
        ok(`Accept nomination → status ${accept.data.status}`);
      } else {
        fail('Accept nomination', JSON.stringify(accept.data));
      }

      const inv2 = await apiGet(invPath, candidateToken);
      const remaining = inv2.data.invitations?.length ?? -1;
      if (remaining === 0) {
        ok('Pending list empty after accept');
      } else {
        fail('Pending list after accept', `still ${remaining}`);
      }

      const minePath = USE_WORKER ? '/nominations/mine' : '/api/nominations/mine';
      const mine = await apiGet(minePath, nominatorToken);
      const row = mine.data.nominations?.find(
        (n) => n.candidates?.members?.full_name === CANDIDATE.name,
      );
      if (row?.candidates?.status === 'pending_approval') {
        ok('Nominator sees status: pending_approval');
      } else {
        fail(
          'Nominator nomination status',
          row?.candidates?.status ?? 'nomination not found',
        );
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
