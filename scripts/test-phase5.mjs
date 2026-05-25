#!/usr/bin/env node
/**
 * Integration test for Phase 5: public candidates & turnout (no auth).
 */

const API = process.env.API_URL ?? 'http://localhost:8787';

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

async function main() {
  console.log('Phase 5 — public election info\n');

  const res = await fetch(`${API}/public/candidates`);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    fail('GET /public/candidates', JSON.stringify(data));
    process.exit(1);
  }
  ok('Public candidates endpoint responds');

  if (data.election?.id && data.election?.cycle_year) {
    ok(`Election ${data.election.cycle_year} (${data.election.phase})`);
  } else {
    fail('Election metadata missing');
  }

  if (Array.isArray(data.candidates)) {
    ok(`Candidates list (${data.candidates.length} approved)`);
    const hasPiiLeak = data.candidates.some(
      (c) => c.license_code_hash || c.email || c.voter_license_hash,
    );
    if (hasPiiLeak) {
      fail('Candidates must not expose voter PII');
    } else {
      ok('No voter PII in public payload');
    }
  } else {
    fail('Candidates array missing');
  }

  if (typeof data.turnout === 'number') {
    ok(`Turnout count: ${data.turnout}`);
  } else {
    fail('Turnout missing');
  }

  if (data.showResults) {
    if (Array.isArray(data.results)) {
      ok(`Results visible (${data.results.length} rows)`);
    } else {
      fail('showResults true but results array missing');
    }
  } else {
    ok('Results hidden until canvassing/certified');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
