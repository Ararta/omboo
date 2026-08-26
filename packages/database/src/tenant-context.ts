import { AsyncLocalStorage } from "node:async_hooks";

// Populated once per authenticated HTTP request (apps/api/src/common/middleware/tenant-context.middleware.ts)
// from the verified JWT's organizationId claim, and read by the tenant-scope Prisma extension so
// every query issued while handling that request is confined to one organization without each
// service method having to remember to filter. Absent outside a request (cron jobs, pre-auth
// flows like login/register) — callers that need per-tenant work outside a request must wrap it
// explicitly with runWithOrgId (see RemindersService for the pattern).
interface TenantStore {
  organizationId: string;
}

const als = new AsyncLocalStorage<TenantStore>();

export function runWithOrgId<T>(organizationId: string, fn: () => T): T {
  return als.run({ organizationId }, fn);
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
