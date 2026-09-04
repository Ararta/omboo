import { AsyncLocalStorage } from "node:async_hooks";

// Parallel to tenant-context.ts, but for the B2B Partner Portal's own tenant concept
// (partnerId), which is deliberately kept fully independent of organizationId — see
// partner-scope.ts's header comment for why. Populated once per authenticated partner HTTP
// request (apps/api/src/common/middleware/partner-context.middleware.ts) from the verified
// partner JWT's partnerId claim. Absent outside a partner request (pre-auth flows like
// partner login/register) — those rely on globally-unique identifiers (PartnerUser.email,
// PartnerRefreshToken.tokenHash) instead.
//
// `tx` holds the single Postgres transaction opened for the whole request (see
// apps/api/src/common/interceptors/partner-tenant-transaction.interceptor.ts) — Layer 2
// (Postgres RLS) needs `SET LOCAL app.current_partner_id` to run in the same transaction as
// every query it's meant to restrict. Typed `unknown` to avoid a circular import on the Prisma
// client type; PartnerPrismaService casts it back.
interface PartnerStore {
  partnerId: string;
  tx?: unknown;
}

const als = new AsyncLocalStorage<PartnerStore>();

export function runWithPartnerId<T>(partnerId: string, fn: () => T): T {
  return als.run({ partnerId }, fn);
}

/** Runs `fn` with `tx` attached as the active transaction for the current partner context —
 * every PartnerPrismaService.client access inside `fn` (including nested async calls) resolves
 * to `tx`. */
export function runWithPartnerTx<T>(tx: unknown, fn: () => T): T {
  const store = als.getStore();
  if (!store) throw new Error("runWithPartnerTx() requires an existing partner context (call runWithPartnerId() first).");
  store.tx = tx;
  try {
    return fn();
  } finally {
    store.tx = undefined;
  }
}

/** Throws if called outside a partner context — use for code paths that must never run unscoped. */
export function getPartnerId(): string {
  const store = als.getStore();
  if (!store) throw new Error("No partner context set — this call must run inside runWithPartnerId().");
  return store.partnerId;
}

/** Returns null outside a partner context instead of throwing — used by the Prisma extension so
 * pre-auth queries (partner login, registration) fall through unscoped rather than crashing. */
export function tryGetPartnerId(): string | null {
  return als.getStore()?.partnerId ?? null;
}

/** The active per-request transaction, if one is open (see runWithPartnerTx). */
export function tryGetPartnerTx(): unknown {
  return als.getStore()?.tx;
}
