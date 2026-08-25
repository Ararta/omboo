# Omboo (Օմբու) — Phase 1

Production build of Omboo's Phase 1: vacation/absence request management, based on the
technical brief and validated prototype in [`reference/`](reference/). See
[`reference/Omboo_texnikakan_handznararagir.docx`](reference/Omboo_texnikakan_handznararagir.docx)
for the full Armenian Labor Code rule set this system implements.

## Stack

- **apps/api** — NestJS (REST), JWT auth, Prisma/PostgreSQL, Puppeteer PDF generation, Resend email.
- **apps/web** — Next.js (App Router), same-origin authenticated proxy to the API, Tailwind.
- **apps/mobile** — Expo Router (React Native). Employee flow (submit/list/cancel requests, respond to recalls) and director flow (approve/reject, team-out) — HR is intentionally web-only (see Status below).
- **packages/shared** — the entire vacation/absence rule engine (business days, work-year bounds, հոդված 163/164.10/169 checks), Zod schemas, and every user-facing Armenian string. Imported identically by the API and the web app so client-side hints and server-side enforcement can never drift.
- **packages/database** — Prisma schema, migrations, seed script.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for local Postgres + MinIO. **Not installed in the environment this was built in** — install it before following the steps below.

## First-time setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter @omboo/database db:migrate
pnpm --filter @omboo/database db:seed
```

`db:migrate` creates the initial migration on first run (there is no committed migration yet
— it was never generated in the build environment, which had no Docker). `db:seed` mirrors
the prototype's three demo employees and creates one login per role, all with the password
`omboo1234`:

| Role | Email |
|---|---|
| Employee (Անի Հակոբյան) | ani.hakobyan@example.am |
| Employee (Դավիթ Սարգսյան) | davit.sargsyan@example.am |
| Employee (Լիլիթ Պետրոսյան) | lilit.petrosyan@example.am |
| Director | director@company.am |
| HR | hr@company.am |

## Running

```bash
pnpm dev
```

Runs every app in parallel via Turborepo: API on `:4000`, web on `:3000`. Open
`http://localhost:3000` — you'll land on `/login`.

Individually: `pnpm --filter @omboo/api start:dev`, `pnpm --filter @omboo/web dev`, `pnpm --filter @omboo/mobile start` (then press `i`/`a` for iOS/Android simulator, or scan the QR code with Expo Go). Mobile talks to the API directly (not through a proxy like web) — set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's LAN IP (not `localhost`) if testing on a physical device.

## Email and file storage in local dev

- **Email** is disabled by default (`EMAIL_SEND_ENABLED=false` in `.env.example`) — the API
  logs what it would have sent instead of calling Resend. Set a real `RESEND_API_KEY` and
  flip the flag to `true` to send for real.
- **Signature uploads** go to the local MinIO instance started by `docker-compose.yml`
  (console at `http://localhost:9001`, login `omboo` / `omboo_dev_password`).

## Testing

```bash
pnpm --filter @omboo/shared test    # business-logic unit tests — run this first, always
pnpm test                           # everything via turbo
```

`packages/shared`'s test suite is the one that matters most: it covers the legally-sensitive
edge cases (leap-year business-day counts, the հոդված 163 exact-boundary case, the
հոդված 164.1 work-year anniversary off-by-one, հոդված 164.10 reminder cadence). If you change
anything in `packages/shared/src`, run this before anything else.

## What's done vs. what's follow-up work

Built and verified in this pass:

- Full monorepo scaffold, Prisma schema, seed script.
- `packages/shared` business logic — **39 unit tests passing**, including the edge cases above.
- `apps/api` — auth (JWT + refresh rotation), employees, requests (all mutations transactional), orders (atomic order-number sequence, Puppeteer PDF, Resend email), recalls, the հոդված 164.10 reminder cron, org settings, S3-compatible signature storage. **Typechecks clean.**
- `apps/web` — login, role-gated routing via middleware, employee/director/HR screens covering the full submit → approve → sign-order → recall workflow, ported design system (Seal, StatusPill, Timeline, INK/PAPER/SEAL/LINE/MUTED tokens).
- `apps/mobile` — Expo Router app, same `@omboo/shared` rule engine and API contract as web. Employee: balance seals, submit/cancel requests, respond to recalls, request detail with Timeline. Director: approve/reject with mandatory rejection note, team-out. Auth tokens live in `expo-secure-store` (OS keychain/keystore), not cookies. **Typechecks clean.**

Explicit follow-up (not attempted, or not verifiable, in this pass):

- **No live end-to-end run, on any platform.** Docker was not installed in the build environment, so `docker compose up`, migrations, and the actual submit→approve→order→PDF→email flow have not been executed against a real database. Verification here was static: `packages/shared`'s unit tests, `tsc --noEmit` / `next build` for api and web, `tsc --noEmit` for mobile. Mobile additionally has never been run in Metro/a simulator/Expo Go — there is no environment here with a simulator or device to test against. Run the steps above and click through all three apps yourself before trusting this in front of anyone.
- **Mobile date inputs are plain text fields** (`YYYY-MM-DD`), not a native date picker — kept dependency-light since there was no simulator here to tune a native picker against. Swapping in `@react-native-community/datetimepicker` is a natural follow-up.
- **Mobile has no offline/error-boundary handling beyond per-screen try/catch** — acceptable for an MVP, not for a store release.
- HR has no mobile screens (by design, see the build plan) — an HR account can log in on mobile but is told to use the web app.
- Full e2e/load testing, CI/CD, production deployment/secrets/hosting configuration, mobile app-store polish (icons, splash screen, EAS build/submit config) — all out of scope for this pass, as flagged in the build plan up front.
- No password-reset/invite-email flow — `POST /employees` returns a one-time temporary password in the response; there's no email delivery of it yet.

## A few corrections made against the prototype

- **Timezone**: the prototype computed "today" via `new Date().toISOString()` (UTC), which can
  be off by a day near midnight in Armenia (UTC+4). The API uses Luxon with the `Asia/Yerevan`
  zone everywhere a legal deadline is computed.
- **Order numbering**: replaced the prototype's in-memory `requests.filter(...).length` count
  (not concurrency-safe, breaks on deletion) with an atomic per-year/per-series `OrderSequence`
  row.
- Two strings in the prototype (`"uzman"`, `"uzarko"`) were garbled placeholder text, not real
  Armenian — cleaned up in `packages/shared/src/messages.ts`. Everything else, including the
  prototype's consistent use of Latin "o" instead of Armenian "օ" for "day" (`oր`), was kept
  verbatim since it's used identically throughout both source documents.
