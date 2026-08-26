import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  createTenantScopedClient,
  prisma,
  tryGetTx,
  type TenantScopedPrismaClient,
  type TenantScopedTransactionClient,
} from "@omboo/database";

/** Thin Nest-lifecycle wrapper around the shared `@omboo/database` Prisma singleton, extended with
 * automatic per-request tenant scoping (see tenant-scope.ts) — Layer 1 of the multi-tenant
 * isolation model. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** The extended client with no transaction attached — only tenant-transaction.interceptor.ts
   * should call $transaction on this directly (once, to open the whole request's transaction).
   * Service code should use `client` below instead. */
  readonly extended: TenantScopedPrismaClient = createTenantScopedClient(prisma);

  /** Resolves to the request's single open transaction when one is active (see
   * tenant-transaction.interceptor.ts) — every authenticated request runs inside exactly one, so
   * Layer 2's `SET LOCAL app.current_org_id` stays in scope for every query the request issues.
   * Falls back to the plain extended client outside a request (cron jobs, which open their own
   * transaction per organization; pre-auth flows, which never touch RLS-protected tables).
   *
   * Because the whole request already shares one transaction, service methods no longer need
   * (and can't call — TransactionClient has no $transaction) their own nested $transaction; just
   * use `this.prisma.client` directly for each step and atomicity is inherited from the request. */
  get client(): TenantScopedPrismaClient | TenantScopedTransactionClient {
    return (tryGetTx() as TenantScopedTransactionClient | undefined) ?? this.extended;
  }

  async onModuleInit() {
    await prisma.$connect();
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
