import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createTenantScopedClient, prisma, TenantScopedPrismaClient } from "@omboo/database";

/** Thin Nest-lifecycle wrapper around the shared `@omboo/database` Prisma singleton, extended with
 * automatic per-request tenant scoping (see tenant-scope.ts) — Layer 1 of the multi-tenant
 * isolation model. `client` reads organizationId from tenant-context.middleware.ts's
 * AsyncLocalStorage, not from anything passed in here. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: TenantScopedPrismaClient = createTenantScopedClient(prisma);

  async onModuleInit() {
    await prisma.$connect();
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
