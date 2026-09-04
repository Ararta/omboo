import { Prisma, PrismaClient } from "@prisma/client";
import { tryGetPartnerId } from "./partner-context";

// The B2B Partner Portal's own tenant-isolation extension — structurally identical to
// tenant-scope.ts but keyed on partnerId instead of organizationId. Deliberately a SEPARATE
// file/extension rather than generalizing tenant-scope.ts for a second column: that file (and
// its RLS policies, and its AsyncLocalStorage store shape) is hardcoded to the literal string
// "organizationId" in three independent places, and partner rows never join to organization
// rows, so there is no cost to keeping the two extensions fully independent — only risk in
// merging them and threatening the existing, working organization isolation.
//
// When no partner context is set (pre-auth flows like partner login/register, or a plain org-
// scoped request that never touches partner data), operations pass through unscoped — Partner
// itself (like Organization) is never in this set. PartnerUser/PartnerRefreshToken ARE included,
// mirroring User/RefreshToken in the org-side TENANT_MODELS: Layer 1 (this extension) still
// applies to them for defense in depth even though Layer 2 (RLS) deliberately doesn't, since
// pre-auth lookups (login) resolve by globally-unique email/tokenHash, never by partnerId, so
// the extension only ever engages here inside an already-authenticated partner request.
// Package/PackagePrice/CommissionRate/MarketingAsset are platform-global and never scoped by
// partnerId at all — not in this set, gated at the API layer instead (see PlatformAdminGuard).
const PARTNER_MODELS = new Set(["PartnerUser", "PartnerRefreshToken", "Order", "Invoice", "PartnerInvoiceSequence"]);

const WHERE_FILTER_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

export const partnerScopeExtension = Prisma.defineExtension({
  name: "partner-scope",
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async $allOperations({ model, operation, args, query }: any) {
        const partnerId = tryGetPartnerId();
        if (!model || !partnerId || !PARTNER_MODELS.has(model)) {
          return query(args);
        }

        if (operation === "create") {
          args.data = { ...args.data, partnerId };
        } else if (operation === "createMany") {
          args.data = Array.isArray(args.data)
            ? args.data.map((item: Record<string, unknown>) => ({ ...item, partnerId }))
            : { ...args.data, partnerId };
        } else if (operation === "upsert") {
          args.where = { ...args.where, partnerId };
          args.create = { ...args.create, partnerId };
        } else if (WHERE_FILTER_OPS.has(operation)) {
          args.where = { ...args.where, partnerId };
        }

        return query(args);
      },
    },
  },
});

export function createPartnerScopedClient(client: PrismaClient) {
  return client.$extends(partnerScopeExtension);
}

export type PartnerScopedPrismaClient = ReturnType<typeof createPartnerScopedClient>;

// The `tx` a `$transaction(async (tx) => ...)` callback receives on the extended client.
export type PartnerScopedTransactionClient = Parameters<
  Parameters<PartnerScopedPrismaClient["$transaction"]>[0]
>[0];
