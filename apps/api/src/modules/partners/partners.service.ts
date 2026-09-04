import { Injectable } from "@nestjs/common";
import { computePayoutEligibleDate } from "@omboo/shared";
import { getPartnerId } from "@omboo/database";
import { PartnerPrismaService } from "../../common/prisma/partner-prisma.service";

@Injectable()
export class PartnersService {
  constructor(private readonly partnerPrisma: PartnerPrismaService) {}

  me() {
    return this.partnerPrisma.client.partner.findUniqueOrThrow({ where: { id: getPartnerId() } });
  }

  async overview() {
    const partnerId = getPartnerId();
    const partner = await this.partnerPrisma.client.partner.findUniqueOrThrow({ where: { id: partnerId } });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const orders = await this.partnerPrisma.client.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: {
        createdAt: true,
        billingCycle: true,
        priceAmountAmd: true,
        commissionAmountAmd: true,
        commissionStatus: true,
      },
    });

    const thisMonthOrders = orders.filter((o) => o.createdAt >= monthStart);
    const thisMonthSalesAmd = thisMonthOrders.reduce((sum, o) => sum + o.priceAmountAmd, 0);
    const pendingCommissionAmd = orders.filter((o) => o.commissionStatus === "PENDING").reduce((sum, o) => sum + o.commissionAmountAmd, 0);
    const paidCommissionAmd = orders.filter((o) => o.commissionStatus === "PAID").reduce((sum, o) => sum + o.commissionAmountAmd, 0);

    // Nearest upcoming payout-eligible date among orders still awaiting commission payout (see
    // computePayoutEligibleDate: invoice date + however long the customer's billing cycle covers).
    const pendingPayoutDates = orders
      .filter((o) => o.commissionStatus === "PENDING")
      .map((o) => computePayoutEligibleDate(o.createdAt.toISOString().slice(0, 10), o.billingCycle))
      .sort();

    return {
      thisMonthSalesAmd,
      pendingCommissionAmd,
      paidCommissionAmd,
      nextPayoutDate: pendingPayoutDates[0] ?? null,
      assignedContactName: partner.assignedContactName,
      assignedContactEmail: partner.assignedContactEmail,
    };
  }
}
