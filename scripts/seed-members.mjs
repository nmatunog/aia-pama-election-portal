#!/usr/bin/env node
/**
 * Seed dev/test members for nomination and login testing.
 *
 * Usage:
 *   node scripts/seed-members.mjs              # print SQL to stdout
 *   node scripts/seed-members.mjs --write      # write supabase/seed/dev-members.sql
 *   node scripts/seed-members.mjs --apply        # upsert via Supabase REST (needs .env.local)
 *   node scripts/seed-members.mjs --csv          # write supabase/seed/dev-login-codes.csv
 *
 * License codes are DEV-ONLY test values. Production roster import should use CSV + ELECOM process.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ZONES = [
  'North Central Luzon',
  'South Central Luzon',
  'Manila 1',
  'Manila 2',
  'Visayas',
  'Mindanao',
];

const FIRST_NAMES = [
  'Maria', 'Juan', 'Ana', 'Jose', 'Rosa', 'Pedro', 'Carmen', 'Antonio',
  'Elena', 'Ricardo', 'Liza', 'Miguel', 'Grace', 'Fernando', 'Angela', 'Roberto',
  'Teresa', 'Carlos', 'Patricia', 'Manuel', 'Sofia', 'Ramon', 'Beatriz', 'Eduardo',
  'Lucia', 'Francisco', 'Isabel', 'Alberto', 'Victoria', 'Enrique',
];

const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Flores',
  'Rivera', 'Gonzales', 'Ramos', 'Aquino', 'Castillo', 'Lim', 'Tan', 'Ong',
  'Sy', 'Go', 'Chua', 'Villanueva', 'Dela Cruz', 'Fernandez', 'Lopez', 'Morales',
  'Navarro', 'Domingo', 'Pascual', 'Soriano', 'Valdez', 'Ignacio',
];

/** @type {{ licenseCode: string; fullName: string; zone: string; goodStanding?: boolean; active?: boolean }[]} */
const PINNED_MEMBERS = [
  { licenseCode: '007264013', fullName: 'Nilo Matunog', zone: 'Visayas' },
];

function hashLicenseCode(licenseCode) {
  return createHash('sha256').update(licenseCode.trim(), 'utf8').digest('hex');
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function buildRoster(perZone = 15) {
  const byLicense = new Map();

  for (const m of PINNED_MEMBERS) {
    byLicense.set(m.licenseCode, {
      licenseCode: m.licenseCode,
      fullName: m.fullName,
      zone: m.zone,
      goodStanding: m.goodStanding ?? true,
      active: m.active ?? true,
    });
  }

  let seq = 7264001;
  for (const zone of ZONES) {
    for (let i = 0; i < perZone; i++) {
      const licenseCode = String(seq++).padStart(9, '0');
      if (byLicense.has(licenseCode)) continue;
      const fullName = `${pick(FIRST_NAMES, seq + i)} ${pick(LAST_NAMES, seq * 3 + i)}`;
      byLicense.set(licenseCode, {
        licenseCode,
        fullName,
        zone,
        goodStanding: true,
        active: true,
      });
    }
  }

  return [...byLicense.values()].sort((a, b) => a.licenseCode.localeCompare(b.licenseCode));
}

function toSql(members) {
  const values = members.map((m) => {
    const hash = hashLicenseCode(m.licenseCode);
    const name = m.fullName.replace(/'/g, "''");
    return `  ('${hash}', '${name}', '${m.zone}'::zone_name, ${m.goodStanding}, ${m.active})`;
  });

  return `-- Dev member roster (${members.length} rows). Run in Supabase SQL Editor.
-- Plaintext license codes: supabase/seed/dev-login-codes.csv
-- Regenerate: node scripts/seed-members.mjs --write

INSERT INTO members (license_code_hash, full_name, zone, good_standing, active)
VALUES
${values.join(',\n')}
ON CONFLICT (license_code_hash) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  zone = EXCLUDED.zone,
  good_standing = EXCLUDED.good_standing,
  active = EXCLUDED.active;
`;
}

function toCsv(members) {
  const header = 'license_code,full_name,zone,good_standing,active';
  const rows = members.map(
    (m) =>
      `${m.licenseCode},${csvEscape(m.fullName)},${csvEscape(m.zone)},${m.goodStanding},${m.active}`,
  );
  return [header, ...rows].join('\n');
}

function csvEscape(value) {
  const s = String(value);
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function loadEnvLocal() {
  const path = resolve(ROOT, '.env.local');
  const text = readFileSync(path, 'utf8');
  /** @type {Record<string, string>} */
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function applyToSupabase(members) {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const rows = members.map((m) => ({
    license_code_hash: hashLicenseCode(m.licenseCode),
    full_name: m.fullName,
    zone: m.zone,
    good_standing: m.goodStanding,
    active: m.active,
  }));

  const res = await fetch(`${url}/rest/v1/members?on_conflict=license_code_hash`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${body}`);
  }

  console.error(`Upserted ${rows.length} members to Supabase.`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const perZone = Number(process.env.SEED_PER_ZONE ?? 15);
  const members = buildRoster(perZone);

  if (args.has('--apply')) {
    await applyToSupabase(members);
    return;
  }

  if (args.has('--csv')) {
    const out = resolve(ROOT, 'supabase/seed/dev-login-codes.csv');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, toCsv(members), 'utf8');
    console.error(`Wrote ${members.length} rows to ${out}`);
    return;
  }

  const sql = toSql(members);

  if (args.has('--write')) {
    const out = resolve(ROOT, 'supabase/seed/dev-members.sql');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, sql, 'utf8');
    console.error(`Wrote ${members.length} members to ${out}`);
    return;
  }

  process.stdout.write(sql);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
