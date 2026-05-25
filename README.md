# AIA-PAMA Election Portal

Official online election system for AIA-PAMA, governed by the AIA-PAMA Election Code.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) |
| API | Cloudflare Workers + Hono |
| Database | Supabase PostgreSQL |
| Auth | OTP + License Code (voters); Supabase Auth (ELECOM admin) |

## Architecture Rules

- **Never** write votes from the frontend
- **All** ballot writes go through the Cloudflare Worker
- **Never** expose Supabase service role key to the frontend
- Ballots are **immutable** (insert-only)

## Monorepo Structure

```
apps/web/          Next.js frontend
apps/api/          Cloudflare Worker API
packages/shared/   Zod schemas, types, business rules
packages/ui/       AIA design system components
supabase/          Database migrations
```

## Getting Started

Run each command separately (do not paste the whole block as one line):

```bash
cd "/Users/nmatunog2/AIAPAMA/AIA-PAMA- Election-portal"
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Web app: http://localhost:3000

```bash
npm run dev:api
```

API worker: http://localhost:8787

```bash
npm run typecheck
```

```bash
npm run test --workspace=@aia-pama/shared
```

## Phase 1 — Auth & local API

**Terminal 1 — Web**

```bash
npm run dev
```

**Terminal 2 — Worker API**

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
# Edit .dev.vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET (same as .env.local)
npm run dev:api
```

Add to `.env.local`:

```env
JWT_SECRET=your-random-secret-at-least-32-characters
```

**Test login** — use your real member row, or seed the dev roster (90 members, 15 per zone):

```bash
npm run seed:members
```

This upserts members via the Supabase API and writes:

- `supabase/seed/dev-members.sql` — run manually in SQL Editor if needed
- `supabase/seed/dev-login-codes.csv` — plaintext license codes for dev login only

Example logins after seeding: `007264013` (Nilo Matunog, Visayas), `007264001`, `007264016`, etc. In dev mode the OTP appears on screen after **Continue**.

To add more per zone: `SEED_PER_ZONE=25 npm run seed:members`

### Phase 2 — Nomination API (dev)

Run migration `004_nomination_indexes.sql` in Supabase SQL Editor.

With both servers running and a logged-in session, test via BFF:

```bash
# Current election + limits (use browser session cookie or JWT from login)
curl -s http://localhost:3000/api/elections/current | jq
curl -s http://localhost:3000/api/nominations/limits -H "Cookie: aia_session=YOUR_TOKEN" | jq

# Search Visayas members (zonal)
curl -s "http://localhost:3000/api/members/search?type=zonal&q=Maria" -H "Cookie: aia_session=YOUR_TOKEN" | jq

# Submit zonal nomination
curl -s -X POST http://localhost:3000/api/nominations/zonal \
  -H "Cookie: aia_session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"electionId":"ELECTION_UUID","candidateMemberId":"MEMBER_UUID","endorserMemberIds":["ENDORSER_UUID"]}' | jq
```

Visit `/nominate` while logged in to file nominations and view **My nominations**.

**Quick start after pause:**

```bash
npm run dev          # terminal 1 — http://localhost:3000
npm run dev:api      # terminal 2 — http://localhost:8787
```

If needed: `npm run seed:election` and `npm run seed:members`.

## Save & push before pausing

After a major revision (or before stopping for the day), commit and push to GitHub:

```bash
npm run save:push
```

With a custom message:

```bash
npm run save:push -- "Phase 3: candidate accept/decline portal"
```

The script runs `typecheck`, refuses to stage `.env.local` / `.dev.vars`, commits all other changes, and pushes to `origin` on the current branch. Skip typecheck when needed: `SKIP_TYPECHECK=1 npm run save:push`.

## Brand Colors

Official AIA Digital Red: `#D41245` — used on primary CTAs only (≤ 20% of layout).

## Phase Status

- [x] **Phase 0** — Monorepo scaffold, design tokens, DB schema, Worker skeleton
- [x] **Phase 1** — Auth (OTP + License Code), Member Dashboard, Supabase election phase
- [x] **Phase 2** — Nomination rules, API, wizard UI, my nominations list
- [ ] Phase 3 — Candidate portal
- [ ] Phase 4 — Voting + vote secrecy
- [ ] Phase 5 — Public dashboard + ELECOM admin
