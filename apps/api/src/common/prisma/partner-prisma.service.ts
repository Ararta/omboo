import { Injectable } from "@nestjs/common";
import {
  createPartnerScopedClient,
  prisma,
  tryGetPartnerTx,
  type PartnerScopedPrismaClient,
  type PartnerScopedTransactionClient,
} from "@omboo/database";

/** Partner-portal counterpart to PrismaService — same shared Prisma singleton (connected/
 * disconnected by PrismaService's lifecycle hooks), extended with automatic per-request
 * partnerId scoping (see packages/database/src/partner-scope.ts) instead of organizationId
 * scoping. A separate injectable rather than a modification of PrismaService, so the existing
 * org request path is completely untouched by this feature. */
@Injectable()
export class PartnerPrismaService {
  /** The extended client with no transaction attached — only
   * partner-tenant-transaction.interceptor.ts should call $transaction on this directly. Service
   * code should use `client` below instead. */
  readonly extended: PartnerScopedPrismaClient = createPartnerScopedClient(prisma);

  /** Resolves to the request's single open transaction when one is active (see
   * partner-tenant-transaction.interceptor.ts). Falls back to the plain extended client outside
   * a partner request (pre-auth flows like partner login/register, which never touch
   * RLS-protected partner tables). */
  get client(): PartnerScopedPrismaClient | PartnerScopedTransactionClient {
    return (tryGetPartnerTx() as PartnerScopedTransactionClient | undefined) ?? this.extended;
  }
}
