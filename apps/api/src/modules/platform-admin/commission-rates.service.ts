import { Injectable, NotFoundException } from "@nestjs/common";
import type { SetCommissionRatesInput } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";

// CommissionRate is platform-global, same reasoning as PackagesService.
@Injectable()
export class CommissionRatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.commissionRate.findMany({
      include: { package: { select: { id: true, key: true, name: true } } },
      orderBy: [{ packageId: "asc" }, { billingCycle: "asc" }, { contractYearTier: "asc" }],
    });
  }

  /** Replaces the full rate set for one package in a single call — matches how the admin UI
   * presents it (a package × cycle × tier grid saved all at once), and avoids partial-update
   * ambiguity. Every Order snapshots the rate it used at creation, so this never retroactively
   * changes a placed order's commission. */
  async setForPackage(dto: SetCommissionRatesInput, updatedByUserId: string) {
    const pkg = await this.prisma.client.package.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException("Փաթեթը չի գտնվել։");

    // No nested $transaction — the whole request already runs inside one (see
    // TenantTransactionInterceptor), so these upserts are already atomic together; a plain
    // sequential await here is both correct and matches the codebase's established pattern.
    for (const rate of dto.rates) {
      await this.prisma.client.commissionRate.upsert({
        where: {
          packageId_billingCycle_contractYearTier: {
            packageId: dto.packageId,
            billingCycle: rate.billingCycle,
            contractYearTier: rate.contractYearTier,
          },
        },
        create: { packageId: dto.packageId, ...rate, updatedByUserId },
        update: { ratePercent: rate.ratePercent, updatedByUserId },
      });
    }

    return this.prisma.client.commissionRate.findMany({ where: { packageId: dto.packageId } });
  }
}
