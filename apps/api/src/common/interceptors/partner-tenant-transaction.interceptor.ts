import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { from, lastValueFrom, Observable } from "rxjs";
import { runWithPartnerTx, tryGetPartnerId } from "@omboo/database";
import { PartnerPrismaService } from "../prisma/partner-prisma.service";

// Partner-portal counterpart to tenant-transaction.interceptor.ts — opens the per-request
// transaction and sets `app.current_partner_id` instead of `app.current_org_id`. Registered as
// a second global APP_INTERCEPTOR alongside TenantTransactionInterceptor: safe to coexist
// because a given request only ever carries org context OR partner context (set by whichever of
// TenantContextMiddleware / PartnerContextMiddleware successfully verified the bearer token
// against its own secret), never both — so exactly one of the two interceptors actually opens a
// transaction per request; the other's `tryGet...Id()` returns null and it's a no-op passthrough.
@Injectable()
export class PartnerTenantTransactionInterceptor implements NestInterceptor {
  constructor(private readonly partnerPrisma: PartnerPrismaService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const partnerId = tryGetPartnerId();
    if (!partnerId) return next.handle();

    return from(
      this.partnerPrisma.extended.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_partner_id', ${partnerId}, true)`;
          return runWithPartnerTx(tx, () => lastValueFrom(next.handle()));
        },
        // DealsService's "New Deal" flow renders a PDF (Puppeteer, slow especially on a cold
        // browser launch), uploads it to S3, and sends an email — all inside this same request,
        // easily exceeding Prisma's 5s interactive-transaction default and aborting an otherwise-
        // successful order/invoice write. 30s covers a cold Puppeteer start plus network I/O with
        // real headroom.
        { timeout: 30_000 },
      ),
    );
  }
}
