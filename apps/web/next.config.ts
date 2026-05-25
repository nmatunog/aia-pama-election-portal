import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Monorepo: root `.env.local` (npm run dev from repo root)
loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig: NextConfig = {
  transpilePackages: ['@aia-pama/shared', '@aia-pama/ui'],
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/pama-logo.png',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
