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

Visit `/candidate` when you have been nominated to **accept or decline** (moves status to `pending_approval` or `declined`).

### ELECOM Admin (dev)

Add to `apps/api/.dev.vars`:

```
ELECOM_ADMIN_EMAIL=nmatunog@gmail.com
ELECOM_ADMIN_PASSWORD=your-dev-password
ELECOM_SUPERUSER_LICENSES=007264013
```

Restart `npm run dev:api`, then either:

- **Member superuser:** `/login` with license `007264013` and contact `nmatunog@gmail.com` → Dashboard shows **ELECOM Administration**, or open `/admin` directly.
- **ELECOM login:** `/admin/login` with `nmatunog@gmail.com` + password above.

ELECOM panel (`/admin`) includes:

| Section | Path | Capabilities |
|---------|------|----------------|
| Overview | `/admin` | Phase control, status counts, pending approval queue, voter/nomination stats |
| Nominees | `/admin/candidates` | All candidacies; filter by status; edit status (incl. approve/reject) |
| Nominations | `/admin/nominations` | Filed nominations, endorser counts, linked candidate status |
| Voters | `/admin/voters` | Qualified roster; toggle good standing / active; voted flag |

**Voting (Phase 4):** Sign in → `/vote` when phase is `voting`. ELECOM sets phase via `/admin` → Overview → phase control.

**Public (Phase 5):** `/candidates` — approved candidates, turnout during voting+, canvassing/certified vote totals. Run migrations `005_public_results.sql` and `006_public_results_grants.sql` in Supabase SQL Editor (or `supabase db push`).

```bash
npm run test:phase4   # requires dev:api + ELECOM credentials in .dev.vars
npm run test:phase5
```

**Certified results** — When phase is `canvassing`, ELECOM uses **Certify & publish announcement** at the top of `/admin` Overview (not the phase dropdown). That sets phase to `certified`, records `certified_at`, and publishes the official announcement on member dashboards and `/candidates`. Rules: zonal winner per zone; top 5 national vote-getters excluding anyone elected zonal (dual candidacy allowed).

Apply migrations `007_dual_candidacy_and_results.sql` and `008_election_certified_at.sql` in Supabase SQL Editor.

**Mock results (dev UI testing)** — populates ballots across all zones, sets phase to `canvassing`:

```bash
npm run seed:members        # if not already done
npm run seed:mock-results   # clears old ballots, seeds ~50 mock votes
```

Then open `/admin` (ELECOM overview) or `/candidates` (public). Use `--reset` by default; to append without clearing: `node scripts/seed-mock-results.mjs`.

**Quick start after pause** — use **two terminals**. Run each command on its own line (do **not** copy the `# …` notes into the terminal — zsh can pass them to `wrangler` and break startup).

**Terminal 1 — Web**

```bash
npm run dev
```

**Terminal 2 — API**

```bash
npm run dev:api
```

Wait until you see `Ready on http://localhost:8787`, then use the app or run tests in a **third** terminal:

```bash
npm run test:phase4
npm run test:phase5
```

**API won’t start or `SQLITE_BUSY`?** Only one `dev:api` at a time. Stop the old terminal, then:

```bash
npm run dev:api:clean
```

That kills anything on port 8787, clears wrangler’s local SQLite cache, and starts fresh.

If needed: `npm run seed:election` and `npm run seed:members`.

## Production deployment

### 1. Supabase (database)

In the **production** Supabase project SQL Editor, run migrations in order (skip any already applied):

`005_public_results.sql` → `006_public_results_grants.sql` → `007_dual_candidacy_and_results.sql` → `008_election_certified_at.sql`

Seed production election/members separately (do **not** use dev login CSV in prod).

### 2. Cloudflare Worker (API)

From `apps/api`:

```bash
cd apps/api
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ELECOM_ADMIN_EMAIL
npx wrangler secret put ELECOM_ADMIN_PASSWORD
npx wrangler secret put ELECOM_SUPERUSER_LICENSES
npm run deploy
```

Note the deployed URL (e.g. `https://aia-pama-election-api.<account>.workers.dev`). Set `ENVIRONMENT = "production"` in `wrangler.toml` `[vars]` or via dashboard before go-live.

### 3. Next.js (web)

Deploy `apps/web` to Vercel (or similar). **Root directory:** `apps/web`.

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (member search BFF) |
| `JWT_SECRET` | Same as Worker |
| `NEXT_PUBLIC_API_URL` | Production Worker URL |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (auth redirects) |

Optional: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, Turnstile secret on Worker.

**OTP email (production login):**

1. Run migration `009_otp_sessions.sql` in Supabase SQL Editor.
2. Create a [Resend](https://resend.com) API key.
3. On the Worker: `npx wrangler secret put RESEND_API_KEY` (and optionally `OTP_EMAIL_FROM` with a verified domain).
4. Redeploy the Worker (`npm run deploy` in `apps/api`).

Until `RESEND_API_KEY` is set, production returns “Email service not configured”. Resend’s test sender (`onboarding@resend.dev`) only delivers to the email on your Resend account unless you verify a custom domain.

### 4. Smoke test

1. Member OTP login → dashboard  
2. `/candidates` (public)  
3. ELECOM `/admin` login → phase control → certify (after canvassing + ballots)  
4. Certified announcement on member dashboard  

```bash
npm run test:phase4
npm run test:phase5
```

(Point tests at production URLs only after secrets are set.)

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
- [x] **Phase 3** — Candidate accept/decline portal (`/candidate`)
- [x] **Phase 4** — Voting ballot (`/vote`, `POST /ballots/submit`, duplicate-vote protection)
- [x] **Phase 5** — Public election info (`/candidates`, turnout, results when canvassing/certified)
- [x] **Phase 6 (ELECOM)** — Admin login, overview, nominees/nominations/voters, phase & status edits
