import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';

let loaded = false;

/** Load `.env.local` from cwd or monorepo root (Next may run with either cwd). */
export function ensureServerEnv(): void {
  if (loaded) return;

  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), 'apps/web'),
    path.resolve(process.cwd(), '../..'),
  ];

  for (const dir of candidates) {
    const root = path.resolve(dir);
    if (
      fs.existsSync(path.join(root, '.env.local')) ||
      fs.existsSync(path.join(root, '.env'))
    ) {
      loadEnvConfig(root);
    }
  }

  loaded = true;
}

export function getJwtSecret(): string | undefined {
  ensureServerEnv();
  return process.env.JWT_SECRET;
}
