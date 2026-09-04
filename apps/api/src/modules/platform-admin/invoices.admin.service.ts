import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

// Manual "mark paid" — this phase has no payment-gateway webhook, so an admin confirms a bank/
// card transfer landed by hand. Cascades Invoice -> Order.status/commissionStatus/
// commissionPaidAt. Uses PrismaService for the same reason as PartnersOverviewService (see its
// header comment) — Order/Invoice RLS needs the platform_admin_bypass policy, which only the
// transaction PlatformAdminTransactionInterceptor marked is visible to.
@Injectable()
export class InvoicesAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async markPaid(invoiceId: string) {
    const invoice = await this.prisma.client.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException("Հաշիվ-ապրանքագիրը չի գտնվել։");

    const updated = await this.prisma.client.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID" },
    });
    await this.prisma.client.order.update({
      where: { id: invoice.orderId },
      data: { status: "PAID", commissionStatus: "PAID", commissionPaidAt: new Date() },
    });
    return updated;
  }
}
