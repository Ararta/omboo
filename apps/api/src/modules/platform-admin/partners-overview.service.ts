import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

// Read-only cross-partner oversight for Platform Admin. Deliberately uses PrismaService (the
// org-side client, already inside this request's open transaction) rather than
// PartnerPrismaService — see PlatformAdminTransactionInterceptor's header comment for why:
// Order/Invoice are RLS-protected under partnerId, and only a client sharing the transaction
// where app.is_platform_admin was SET LOCAL can see across every partner via the
// platform_admin_bypass policy.
@Injectable()
export class PartnersOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  listPartners() {
    return this.prisma.client.partner.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listOrders() {
    return this.prisma.client.order.findMany({
      include: {
        partner: { select: { id: true, companyName: true } },
        package: { select: { id: true, name: true } },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }
}
