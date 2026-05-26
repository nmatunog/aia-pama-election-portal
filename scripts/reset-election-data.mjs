#!/usr/bin/env node
/**
 * Reset election mock data: ballots, results, candidacies, nominations, certification.
 * Keeps members roster and the election row (returns to nomination phase).
 *
 * Usage:
 *   npm run reset:election
 *   node scripts/reset-election-data.mjs
 *   node scripts/reset-election-data.mjs --votes-only   # ballots + phase only
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    'elections?select=id,cycle_year,phase,certified_at&order=created_at.desc&limit=1',
  );
  if (!ok || !data?.[0]) throw new Error('No election row — run npm run seed:election');
  return data[0];
}

async function resetBallots(env, electionId) {
  await sb(env, `voter_participation?election_id=eq.${electionId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });

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

async function resetCandidacies(env, electionId) {
  const noms = await sb(
    env,
    `nominations?election_id=eq.${electionId}&select=id`,
  );
  const nomIds = (noms.data ?? []).map((n) => n.id);

  if (nomIds.length > 0) {
    const inNoms = nomIds.join(',');
    await sb(env, `endorsements?nomination_id=in.(${inNoms})`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await sb(env, `nominations?election_id=eq.${electionId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }

  const cand = await sb(
    env,
    `candidates?election_id=eq.${electionId}&select=id`,
  );
  const candCount = (cand.data ?? []).length;
  if (candCount > 0) {
    await sb(env, `candidates?election_id=eq.${electionId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }

  return { nominations: nomIds.length, candidates: candCount };
}

async function resetOtpSessions(env) {
  const { ok, status } = await sb(env, 'otp_sessions?id=not.is.null', {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  if (!ok && status !== 404) {
    console.warn('Clear otp_sessions:', status);
  }
}

async function resetElectionMeta(env, electionId) {
  const closes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { ok, status, data } = await sb(env, `elections?id=eq.${electionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      phase: 'nomination',
      certified_at: null,
      voting_opens_at: null,
      voting_closes_at: null,
      nomination_opens_at: new Date().toISOString(),
      nomination_closes_at: closes,
      updated_at: new Date().toISOString(),
    }),
    prefer: 'return=minimal',
  });
  if (!ok) throw new Error(`Election reset failed: ${status} ${JSON.stringify(data)}`);
}

async function main() {
  const votesOnly = process.argv.includes('--votes-only');

  const raw = loadEnvLocal();
  const env = {
    url: raw.NEXT_PUBLIC_SUPABASE_URL ?? raw.SUPABASE_URL,
    key: raw.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!env.url || !env.key) {
    throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  console.log('Reset election data\n');

  const election = await getElection(env);
  console.log(`Election: ${election.cycle_year} (${election.id})`);
  console.log(`Was: phase=${election.phase}, certified_at=${election.certified_at ?? 'null'}\n`);

  const ballots = await resetBallots(env, election.id);
  console.log(`Removed ${ballots} ballot(s) and related votes / turnout`);

  await resetOtpSessions(env);
  console.log('Cleared OTP login sessions');

  if (!votesOnly) {
    const { nominations, candidates } = await resetCandidacies(env, election.id);
    console.log(`Removed ${nominations} nomination(s), ${candidates} candidacy row(s)`);
  } else {
    console.log('Kept candidates and nominations (--votes-only)');
  }

  await resetElectionMeta(env, election.id);
  console.log('Election phase set to: nomination (certified_at cleared)');

  console.log('\nDone. Members roster unchanged.');
  console.log('Next: npm run seed:mock-results  (optional mock votes)');
  console.log('      or use the portal for real nominations / voting.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
