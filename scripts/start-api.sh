#!/usr/bin/env bash
# Start a single local API dev server on :8787 (avoids duplicate wrangler / SQLITE_BUSY).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

echo "Stopping any process on port 8787…"
for pid in $(lsof -ti :8787 2>/dev/null || true); do
  kill "$pid" 2>/dev/null || true
done
sleep 1

if [[ "${1:-}" == "--clean" ]]; then
  echo "Clearing wrangler local state…"
  rm -rf .wrangler/state
fi

echo "Starting API at http://localhost:8787"
echo "(Run tests in another terminal: npm run test:phase4)"
exec npx wrangler dev --port 8787 --persist-to .wrangler/state
