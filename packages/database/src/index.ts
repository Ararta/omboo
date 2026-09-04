import { PrismaClient } from "@prisma/client";

// Reused across hot-reloads in dev (NestJS + ts-node-dev) so we don't exhaust Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __omboo_prisma__: PrismaClient | undefined;
}

// The running app connects as the unprivileged omboo_app role (APP_DATABASE_URL), not the
// migration-owning superuser (DATABASE_URL) — Postgres RLS (see the enable_rls migration) only
// applies to non-superuser roles, so this is what makes Layer 2 actually bind at runtime.
// Falls back to DATABASE_URL so one-off scripts (seed.ts, migrate-to-multitenant.ts — which
// construct their own PrismaClient() directly, not this singleton) and any environment that
// hasn't set APP_DATABASE_URL yet keep working.
export const prisma: PrismaClient =
  globalThis.__omboo_prisma__ ??
  new PrismaClient({ datasourceUrl: process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.__omboo_prisma__ = prisma;
}

export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
export * from "./tenant-context";
export * from "./tenant-scope";
export * from "./partner-context";
export * from "./partner-scope";
