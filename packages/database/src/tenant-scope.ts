import { Prisma, PrismaClient } from "@prisma/client";
import { tryGetOrgId } from "./tenant-context";

// Layer 1 of the multi-tenant isolation model (see the migration plan): every model below carries
// organizationId directly. Whenever a request-scoped organizationId is available (set by
// apps/api's tenant-context middleware from the caller's verified JWT), this extension injects it
// into every query automatically, so an individual service method forgetting to filter by
// organizationId becomes structurally impossible rather than a discipline problem. Layer 2
// (Postgres RLS) is the independent DB-level backstop for the same guarantee.
//
// When no tenant context is set (pre-auth flows like login/register-organization, or a cron job
// that hasn't opted into a specific org via runWithOrgId), operations pass through unscoped —
// those flows rely on globally-unique identifiers (User.email, RefreshToken.tokenHash) or operate
// deliberately across all tenants (Organization lookups), never on tenant-scoped data at large.
const TENANT_MODELS = new Set([
  "User",
  "RefreshToken",
  "Employee",
  "EmployeeDocument",
  "AttendanceLog",
  "Request",
  "RequestHistory",
  "Recall",
  "OrgSettings",
  "OrderSequence",
  "Notification",
  "BalanceAdjustmentLog",
  "AuditLog",
]);

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

export const tenantScopeExtension = Prisma.defineExtension({
  name: "tenant-scope",
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async $allOperations({ model, operation, args, query }: any) {
        const organizationId = tryGetOrgId();
        if (!model || !organizationId || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        if (operation === "create") {
          args.data = { ...args.data, organizationId };
        } else if (operation === "createMany") {
          args.data = Array.isArray(args.data)
            ? args.data.map((item: Record<string, unknown>) => ({ ...item, organizationId }))
            : { ...args.data, organizationId };
        } else if (operation === "upsert") {
          args.where = { ...args.where, organizationId };
          args.create = { ...args.create, organizationId };
        } else if (WHERE_FILTER_OPS.has(operation)) {
          args.where = { ...args.where, organizationId };
        }

        return query(args);
      },
    },
  },
});

export function createTenantScopedClient(client: PrismaClient) {
  return client.$extends(tenantScopeExtension);
}

export type TenantScopedPrismaClient = ReturnType<typeof createTenantScopedClient>;

// The `tx` a `$transaction(async (tx) => ...)` callback receives on the extended client — used
// to type helper methods (NotificationsService.notifyRole/notifyEmployee) that accept "whatever
// transaction client the caller is already inside" rather than opening their own.
export type TenantScopedTransactionClient = Parameters<
  Parameters<TenantScopedPrismaClient["$transaction"]>[0]
>[0];
