#!/usr/bin/env node
/**
 * Remove all members except ELECOM superuser license(s).
 * Default keep: 007264013 (Nilo Matunog). Reads ELECOM_SUPERUSER_LICENSES from apps/api/.dev.vars if present.
 *
 * Usage: npm run reset:members
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_KEEP = ['007264013'];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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

function hashLicenseCode(code) {
  return createHash('sha256').update(code.trim(), 'utf8').digest('hex');
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

function parseKeepLicenses() {
  const devVars = loadEnvFile(resolve(ROOT, 'apps/api/.dev.vars'));
  const raw = devVars.ELECOM_SUPERUSER_LICENSES;
  if (!raw) return DEFAULT_KEEP;
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

async function main() {
  const local = loadEnvFile(resolve(ROOT, '.env.local'));
  const env = {
    url: local.NEXT_PUBLIC_SUPABASE_URL ?? local.SUPABASE_URL,
    key: local.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!env.url || !env.key) {
    throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const keepLicenses = parseKeepLicenses();
  const keepHashes = keepLicenses.map(hashLicenseCode);

  console.log('Keep superuser license(s):', keepLicenses.join(', '));

  const keepRes = await sb(
    env,
    `members?license_code_hash=in.(${keepHashes.join(',')})&select=id,full_name,zone,license_code_hash`,
  );
  if (!keepRes.ok) throw new Error(`Lookup failed: ${keepRes.status}`);

  const keepRows = keepRes.data ?? [];
  if (keepRows.length === 0) {
    throw new Error(
      `No member row for superuser license(s). Run npm run seed:members first, or check ELECOM_SUPERUSER_LICENSES.`,
    );
  }

  for (const row of keepRows) {
    console.log(`Keeping: ${row.full_name} (${row.zone}) — ${row.id}`);
  }

  const keepIds = new Set(keepRows.map((r) => r.id));

  const all = await sb(env, 'members?select=id,full_name');
  if (!all.ok) throw new Error('Could not list members');
  const toRemove = (all.data ?? []).filter((m) => !keepIds.has(m.id));

  if (toRemove.length === 0) {
    console.log('No other members to remove.');
    return;
  }

  const election = await sb(env, 'elections?select=id&order=created_at.desc&limit=1');
  const electionId = election.data?.[0]?.id;
  if (electionId) {
    await sb(env, `candidates?election_id=eq.${electionId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
    await sb(env, `nominations?election_id=eq.${electionId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }

  await sb(env, 'otp_sessions?id=not.is.null', {
    method: 'DELETE',
    prefer: 'return=minimal',
  });

  const removeIds = toRemove.map((m) => m.id);
  const inList = removeIds.join(',');
  const del = await sb(env, `members?id=in.(${inList})`, {
    method: 'DELETE',
    prefer: 'return=representation',
  });

  if (!del.ok) {
    throw new Error(
      `Delete failed (${del.status}): ${JSON.stringify(del.data)}. Run npm run reset:election first if FK blocks.`,
    );
  }

  const deleted = del.data ?? [];
  console.log(`\nRemoved ${deleted.length} member(s).`);
  console.log(`Roster size: ${keepRows.length} (superuser only).`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
