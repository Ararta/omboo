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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for local Postgres + MinIO. On Windows this needs WSL2; if `docker` isn't found after installing, enable the `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` Windows features, reboot, then run `wsl --update --web-download` (the plain Microsoft Store-backed `wsl --update` can hang indefinitely in some environments — the `--web-download` variant fetches the kernel MSI directly and is more reliable).

## First-time setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter @omboo/database db:migrate:deploy
pnpm --filter @omboo/database db:seed
```

The initial migration (`packages/database/prisma/migrations/20260825110516_init`) is committed
and was applied to a real local Postgres instance as part of verifying this build — use
`db:migrate:deploy` to apply it as-is. (`db:migrate` — i.e. `prisma migrate dev` — is only for
when you're changing `schema.prisma` yourself and want Prisma to generate a new migration.)
`db:seed` mirrors the prototype's three demo employees and creates one login per role, all with
the password `omboo1234`:

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

Runs every app in parallel via Turborepo: API on `:4000`, web on `:3000`. `pnpm dev` builds
`packages/shared`/`packages/database` first automatically (see the bug notes below for why
that matters), so this one command is enough on a fresh clone. Open `http://localhost:3000` —
you'll land on `/login`.

Individually, use turbo's `--filter` (not plain `pnpm --filter`, which skips the `^build`
dependency and will hit the module-resolution bug described below): `pnpm turbo run dev --filter=@omboo/api`,
`pnpm turbo run dev --filter=@omboo/web`. Mobile has no build-order dependency issue, so plain
`pnpm --filter @omboo/mobile start` is fine (then press `i`/`a` for iOS/Android simulator, or
scan the QR code with Expo Go) — it talks to the API directly (not through a proxy like web),
so set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's LAN IP (not `localhost`)
if testing on a physical device.

Each app's own `apps/*/.env` (or `.env.local` for web) needs the same values as the root
`.env` — copy it in (`cp .env apps/api/.env && cp .env apps/web/.env.local`) since `apps/api`
and `apps/web` each read env vars from their own directory, not the monorepo root.

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

Built and verified in this pass — **including a real end-to-end run** against Postgres + MinIO in Docker (not just static typechecks): logged in as all three seeded roles through the actual browser UI, submitted a vacation request (and watched the client-side հոդված 163 chunk-rule check correctly block one combination of dates before a valid one was accepted), approved it as director, generated and Puppeteer-rendered a signed order PDF as HR, downloaded it, and ran a full recall (request → employee accepts → HR finalizes → balance restored) — all against real seeded data, with the 164.10 reminder panel correctly showing live-computed overdue/remaining days for the seeded employees.

- Full monorepo scaffold, Prisma schema (migration applied to a real Postgres instance), seed script (ran successfully).
- `packages/shared` business logic — **39 unit tests passing**, including the edge cases above.
- `apps/api` — auth (JWT + refresh rotation), employees, requests (all mutations transactional), orders (atomic order-number sequence, Puppeteer PDF, Resend email), recalls, the հոդված 164.10 reminder cron, org settings, S3-compatible signature storage. **Booted against a real database and exercised end-to-end**, including a real generated PDF (verified byte-for-byte correct Armenian legal-document text).
- `apps/web` — login, role-gated routing via middleware, employee/director/HR screens covering the full submit → approve → sign-order → recall workflow, ported design system (Seal, StatusPill, Timeline, INK/PAPER/SEAL/LINE/MUTED tokens). **Clicked through in a real browser** as all three roles.
- `apps/mobile` — Expo Router app, same `@omboo/shared` rule engine and API contract as web. Employee: balance seals, submit/cancel requests, respond to recalls, request detail with Timeline. Director: approve/reject with mandatory rejection note, team-out. Auth tokens live in `expo-secure-store` (OS keychain/keystore), not cookies. **Typechecks clean; not yet run in a simulator/device** (see follow-up below).

Two real runtime bugs were found and fixed during this end-to-end pass (both invisible to `tsc`/`next build`, since TypeScript resolves module graphs differently than Node does at runtime):

- `packages/shared` and `packages/database` originally pointed their `package.json` `main`/`types` at raw `.ts` source. Next.js's webpack could resolve that (with a `resolve.extensionAlias` config in `next.config.mjs`), but plain Node.js — how `apps/api` actually runs — could not resolve the NodeNext-style `.js`-import-pointing-at-`.ts`-file convention at all when loading `@omboo/shared` directly. Fixed by having both packages build to a real `dist/` and pointing `package.json` there instead — the correct pattern for an internal package consumed by both a bundler and plain Node.
- Even after that fix, `@omboo/database`'s `prisma` named export came back `undefined` specifically when `require()`'d from `apps/api`'s CommonJS output (it worked fine via native ESM `import()`) — a real limitation of Node's synchronous `require(esm)` interop when a local `export const` is followed by `export * from`. Fixed by compiling `packages/database` as plain CommonJS instead of ESM, since it's only ever consumed by the Node-only API.
- `turbo.json`'s `dev` task now depends on `^build`, so `pnpm dev` builds `packages/shared`/`packages/database` first automatically — without this, every fresh clone would hit the exact bug above.

Explicit follow-up (not attempted, or not verifiable, in this pass):

- **`apps/mobile` has never been run in Metro/a simulator/Expo Go** — there was no simulator or device in this environment. Typechecks clean, but that doesn't catch runtime module-resolution issues the same class as the two bugs above; test on a real device/simulator before trusting it.
- **Mobile date inputs are plain text fields** (`YYYY-MM-DD`), not a native date picker — kept dependency-light since there was no simulator here to tune a native picker against. Swapping in `@react-native-community/datetimepicker` is a natural follow-up.
- **Mobile has no offline/error-boundary handling beyond per-screen try/catch** — acceptable for an MVP, not for a store release.
- HR has no mobile screens (by design, see the build plan) — an HR account can log in on mobile but is told to use the web app.
- Full e2e/load testing, CI/CD, production deployment/secrets/hosting configuration, mobile app-store polish (icons, splash screen, EAS build/submit config) — all out of scope for this pass, as flagged in the build plan up front.
- No password-reset/invite-email flow — `POST /employees` returns a one-time temporary password in the response; there's no email delivery of it yet.
- Email sending was verified only in its disabled/logged mode (`EMAIL_SEND_ENABLED=false`) — a real `RESEND_API_KEY` send has not been tested.

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
