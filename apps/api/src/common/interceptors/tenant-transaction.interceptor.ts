import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { from, lastValueFrom, Observable } from "rxjs";
import { runWithTx, tryGetOrgId } from "@omboo/database";
import { PrismaService } from "../prisma/prisma.service";

// Layer 2 (Postgres RLS) needs `SET LOCAL app.current_org_id` to hold for every query a request
// issues, and SET LOCAL only lives for one Postgres transaction — so every authenticated request
// runs entirely inside one interactive Prisma transaction, opened here, right after
// tenant-context.middleware.ts has set organizationId in the AsyncLocalStorage context. Public
// routes (login, register-organization) have no org context yet and pass through untouched: RLS
// isn't enabled on the tables those routes touch (see the enable_rls migration).
//
// Because the whole request shares one transaction, service methods must NOT open their own
// nested $transaction — PrismaService.client already resolves to this transaction for the
// duration of the request (see runWithTx), so a plain `this.prisma.client.model.create(...)` is
// already part of it.
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const organizationId = tryGetOrgId();
    if (!organizationId) return next.handle();

    return from(
      this.prisma.extended.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
          return runWithTx(tx, () => lastValueFrom(next.handle()));
        },
        // OrdersService.confirmAndSignOrder (and the Partner Portal's DealsService) render a PDF
        // (Puppeteer, slow especially on a cold browser launch), upload it to S3, and send an
        // email — all inside this same request, easily exceeding Prisma's 5s interactive-
        // transaction default and aborting an otherwise-successful write. 30s covers a cold
        // Puppeteer start plus network I/O with real headroom.
        { timeout: 30_000 },
      ),
    );
  }
}
