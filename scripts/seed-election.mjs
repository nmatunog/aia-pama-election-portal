#!/usr/bin/env node
/**
 * Ensure one election row exists in nomination phase.
 * Usage: node scripts/seed-election.mjs
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = val;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in .env.local');

  const existing = await fetch(
    `${url}/rest/v1/elections?select=id,phase&order=created_at.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await existing.json();
  if (rows[0]?.phase === 'nomination') {
    console.log('Election already in nomination phase:', rows[0].id);
    return;
  }

  const body = {
    cycle_year: 2026,
    phase: 'nomination',
    nomination_opens_at: new Date().toISOString(),
    nomination_closes_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const res = await fetch(`${url}/rest/v1/elections`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Insert failed: ${res.status} ${await res.text()}`);
  }

  const created = await res.json();
  console.log('Created election:', created[0]?.id ?? created);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
