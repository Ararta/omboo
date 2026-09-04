import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { contractYearToTier, fmtDateHY, formatInvoiceNumber, todayInYerevan, type CreateOrderInput } from "@omboo/shared";
import { getPartnerId } from "@omboo/database";
import { PartnerPrismaService } from "../../common/prisma/partner-prisma.service";
import { StorageService } from "../storage/storage.service";
import { EmailService } from "../email/email.service";
import { DealPdfService, buildInvoiceDocumentData } from "./deal-pdf.service";

@Injectable()
export class DealsService {
  constructor(
    private readonly partnerPrisma: PartnerPrismaService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly dealPdf: DealPdfService,
  ) {}

  list() {
    return this.partnerPrisma.client.order.findMany({
      include: { package: { select: { id: true, name: true } }, invoice: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Active packages + their per-cycle prices, for the New Deal form's package picker. Package/
   * PackagePrice are platform-global (no partnerId) — any authenticated partner may read them,
   * same as marketing assets. Commission rates are NOT exposed here (partner shouldn't need to
   * see the raw admin rate table; the itemized commission is shown on the created order instead). */
  listPackages() {
    return this.partnerPrisma.client.package.findMany({
      where: { isActive: true },
      include: { prices: { orderBy: { billingCycle: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const order = await this.partnerPrisma.client.order.findUnique({
      where: { id },
      include: { package: { select: { id: true, name: true } }, invoice: true },
    });
    if (!order) throw new NotFoundException("Գործարքը չի գտնվել։");
    return order;
  }

  /** The core "New Deal" flow: partner picks a package/cycle, fills in a referred customer's
   * lead info -> an Order is created with its price/commission SNAPSHOTTED from the (then-
   * current) global Package/CommissionRate tables (never re-derived live later), a prepayment
   * Invoice is generated as a PDF and emailed to the customer. */
  async create(dto: CreateOrderInput, createdByPartnerUserId: string) {
    const pkg = await this.partnerPrisma.client.package.findUnique({
      where: { id: dto.packageId },
      include: { prices: true },
    });
    if (!pkg || !pkg.isActive) throw new NotFoundException("Փաթեթը չի գտնվել կամ այլևս ակտիվ չէ։");

    const price = pkg.prices.find((p) => p.billingCycle === dto.billingCycle);
    if (!price) throw new BadRequestException("Այս փաթեթի համար այս ցիկլով գին սահմանված չէ։");

    const contractYearTier = contractYearToTier(dto.contractYear);
    const rate = await this.partnerPrisma.client.commissionRate.findUnique({
      where: {
        packageId_billingCycle_contractYearTier: {
          packageId: dto.packageId,
          billingCycle: dto.billingCycle,
          contractYearTier,
        },
      },
    });
    if (!rate) throw new BadRequestException("Այս փաթեթի/ցիկլի/տարվա համար կոմիսիայի տոկոս սահմանված չէ։");

    const commissionAmountAmd = Math.round((price.amountAmd * rate.ratePercent) / 100);

    const partnerId = getPartnerId();
    const order = await this.partnerPrisma.client.order.create({
      data: {
        partnerId,
        packageId: dto.packageId,
        billingCycle: dto.billingCycle,
        contractYear: dto.contractYear,
        customerCompanyName: dto.customerCompanyName,
        customerContactName: dto.customerContactName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        priceAmountAmd: price.amountAmd,
        commissionRatePercent: rate.ratePercent,
        commissionAmountAmd,
        notes: dto.notes,
        createdByPartnerUserId,
      },
    });

    const invoice = await this.generateInvoice(order.id, partnerId);
    // order.create() above doesn't include the package relation (only pgk's own scalar fields
    // were needed to compute the snapshot) — the web New Deal confirmation panel shows the
    // package name, so shape this response the same as GET /deals's `include: { package: ... }`.
    return { order: { ...order, package: { id: pkg.id, name: pkg.name } }, invoice };
  }

  private async generateInvoice(orderId: string, partnerId: string) {
    const order = await this.partnerPrisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { package: true },
    });
    const partner = await this.partnerPrisma.client.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { companyName: true },
    });

    const year = new Date().getFullYear();
    const seq = await this.partnerPrisma.client.partnerInvoiceSequence.upsert({
      where: { partnerId_year: { partnerId, year } },
      update: { lastValue: { increment: 1 } },
      create: { partnerId, year, lastValue: 1 },
    });
    const invoiceNumber = formatInvoiceNumber(year, seq.lastValue);

    const invoice = await this.partnerPrisma.client.invoice.create({
      data: {
        partnerId,
        orderId: order.id,
        invoiceNumber,
        amountAmd: order.priceAmountAmd,
        status: "DRAFT",
      },
    });

    const pdf = await this.dealPdf.renderPdf(
      buildInvoiceDocumentData({
        invoiceNumber,
        issueDateHY: fmtDateHY(todayInYerevan()),
        customerCompanyName: order.customerCompanyName,
        customerContactName: order.customerContactName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        partnerCompanyName: partner.companyName,
        packageName: order.package.name,
        billingCycle: order.billingCycle,
        amountAmd: order.priceAmountAmd,
      }),
    );

    const pdfFileKey = `partner-invoices/${partnerId}/${invoice.id}.pdf`;
    await this.storage.uploadObject(pdfFileKey, pdf, "application/pdf");

    await this.email.sendPdf(
      order.customerEmail,
      `Կանխավճարի հաշիվ № ${invoiceNumber}`,
      `Կցված է Ձեր կանխավճարի հաշիվը (№ ${invoiceNumber})՝ «${order.package.name}» փաթեթի համար։`,
      pdf,
      `${invoiceNumber}.pdf`,
    );

    return this.partnerPrisma.client.invoice.update({
      where: { id: invoice.id },
      data: { pdfFileKey, status: "SENT", sentAt: new Date() },
    });
  }

  /** Short-lived presigned URL to re-download an already-generated invoice PDF — same pattern
   * as DocumentsService.downloadUrl. Order/Invoice are already partner-scoped by the extension +
   * RLS, so getOne() here can't return another partner's order. */
  async invoiceDownloadUrl(orderId: string): Promise<{ url: string; fileName: string }> {
    const order = await this.getOne(orderId);
    if (!order.invoice?.pdfFileKey) throw new NotFoundException("Հաշիվ-ապրանքագիրը դեռ պատրաստ չէ։");
    const url = await this.storage.presignGet(order.invoice.pdfFileKey, 300);
    return { url, fileName: `${order.invoice.invoiceNumber}.pdf` };
  }

  async cancel(id: string) {
    const order = await this.getOne(id);
    if (order.status !== "PENDING_PAYMENT") {
      throw new BadRequestException("Միայն վճարման սպասող գործարքը կարելի է չեղարկել։");
    }
    await this.partnerPrisma.client.order.update({ where: { id }, data: { status: "CANCELLED" } });
    if (order.invoice) {
      await this.partnerPrisma.client.invoice.update({ where: { id: order.invoice.id }, data: { status: "CANCELLED" } });
    }
    return this.getOne(id);
  }
}
