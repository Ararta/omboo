import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { from, lastValueFrom, Observable } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";

// Platform Admin (an Organization with isPlatformOwner = true) needs to read/update orders and
// invoices ACROSS every partner — but those tables' tenant_isolation RLS policy only admits
// rows matching app.current_partner_id, which a platform-admin request (authenticated with the
// org JWT, no partner JWT) never has set. See the platform_admin_bypass RLS policy (migration
// 20260829181500) — a second, OR'd permissive policy that admits every row when
// app.is_platform_admin is set. This interceptor sets that flag, inside the SAME transaction
// TenantTransactionInterceptor already opened for this request (this.prisma.client resolves to
// it) — apply only to controllers already behind PlatformAdminGuard, which is what makes setting
// this flag safe: a partner's own request can never reach this interceptor.
//
// Cross-partner Order/Invoice reads in platform-admin code must go through PrismaService (this
// one), not PartnerPrismaService — the latter has no open transaction in a platform-admin
// request (no partnerId context exists to trigger one) and would run on a fresh connection that
// never had this flag set.
@Injectable()
export class PlatformAdminTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(
      (async () => {
        await this.prisma.client.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
        return lastValueFrom(next.handle());
      })(),
    );
  }
}
