import { AsyncLocalStorage } from "node:async_hooks";

// Populated once per authenticated HTTP request (apps/api/src/common/middleware/tenant-context.middleware.ts)
// from the verified JWT's organizationId claim, and read by the tenant-scope Prisma extension so
// every query issued while handling that request is confined to one organization without each
// service method having to remember to filter. Absent outside a request (cron jobs, pre-auth
// flows like login/register) — callers that need per-tenant work outside a request must wrap it
// explicitly with runWithOrgId (see RemindersService for the pattern).
//
// `tx` holds the single Postgres transaction opened for the whole request (see
// apps/api/src/common/interceptors/tenant-transaction.interceptor.ts) once one is open — Layer 2
// (Postgres RLS) needs `SET LOCAL app.current_org_id` to run in the same transaction as every
// query it's meant to restrict, and `SET LOCAL` only lives for one transaction, so the whole
// request shares one. Typed `unknown` here to avoid a circular import on the Prisma client type;
// PrismaService casts it back.
interface TenantStore {
  organizationId: string;
  tx?: unknown;
}

const als = new AsyncLocalStorage<TenantStore>();

export function runWithOrgId<T>(organizationId: string, fn: () => T): T {
  return als.run({ organizationId }, fn);
}

/** Runs `fn` with `tx` attached as the active transaction for the current tenant context — every
 * PrismaService.client access inside `fn` (including in nested async calls) resolves to `tx`. */
export function runWithTx<T>(tx: unknown, fn: () => T): T {
  const store = als.getStore();
  if (!store) throw new Error("runWithTx() requires an existing tenant context (call runWithOrgId() first).");
  store.tx = tx;
  try {
    return fn();
  } finally {
    store.tx = undefined;
  }
}

/** Throws if called outside a tenant context — use for code paths that must never run unscoped. */
export function getOrgId(): string {
  const store = als.getStore();
  if (!store) throw new Error("No tenant context set — this call must run inside runWithOrgId().");
  return store.organizationId;
}

/** Returns null outside a tenant context instead of throwing — used by the Prisma extension so
 * pre-auth queries (login, registration) fall through unscoped rather than crashing. */
export function tryGetOrgId(): string | null {
  return als.getStore()?.organizationId ?? null;
}

/** The active per-request transaction, if one is open (see runWithTx). */
export function tryGetTx(): unknown {
  return als.getStore()?.tx;
}
