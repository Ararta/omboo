import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { buildOrderDocumentData, formatOrderNumber, historySteps, notifications, todayInYerevan } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrgSettingsService } from "../org-settings/org-settings.service";
import { EmailService } from "../email/email.service";
import { toISODate } from "../requests/request-mappers";
import { OrderPdfService } from "./order-pdf.service";

const HR_ACTOR = "ՄՌԿ մասնագետ";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly orgSettings: OrgSettingsService,
    private readonly emailService: EmailService,
    private readonly orderPdf: OrderPdfService,
  ) {}

  private async getRequestForOrder(requestId: string) {
    const request = await this.prisma.client.request.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!request) throw new NotFoundException("Հայտ-դիմումը չի գտնվել։");
    return request;
  }

  private async toDataUri(key: string): Promise<string> {
    const buffer = await this.orgSettings.getSignatureBuffer(key);
    const ext = key.split(".").pop() ?? "png";
    const mime = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  /** Read-only preview: computes the tentative next order number WITHOUT incrementing the
   * sequence, so HR can preview/cancel repeatedly without burning numbers. */
  async openOrderPreview(requestId: string) {
    const request = await this.getRequestForOrder(requestId);
    if (request.status !== "APPROVED") throw new ForbiddenException("Հրաման կարելի է կազմել միայն հաստատված հայտ-դիմումի համար։");
    const org = await this.orgSettings.get();
    const year = new Date().getFullYear();
    const seq = await this.prisma.client.orderSequence.findUnique({ where: { year_series: { year, series: "PRIMARY" } } });
    const tentativeOrderNumber = formatOrderNumber(year, "PRIMARY", (seq?.lastValue ?? 0) + 1);

    return buildOrderDocumentData(
      { start: toISODate(request.start), end: toISODate(request.end), days: request.days },
      { name: request.employee.name, hireDate: toISODate(request.employee.hireDate) },
      org,
      tentativeOrderNumber,
      todayInYerevan(),
      false,
      null,
    );
  }

  async confirmAndSignOrder(requestId: string): Promise<{ orderNumber: string; pdfBase64: string }> {
    const request = await this.getRequestForOrder(requestId);
    if (request.status !== "APPROVED") throw new ForbiddenException("Հրաման կարելի է կազմել միայն հաստատված հայտ-դիմումի համար։");
    const org = await this.orgSettings.get();
    const year = new Date().getFullYear();

    const { orderNumber } = await this.prisma.client.$transaction(async (tx) => {
      const seq = await tx.orderSequence.upsert({
        where: { year_series: { year, series: "PRIMARY" } },
        update: { lastValue: { increment: 1 } },
        create: { year, series: "PRIMARY", lastValue: 1 },
      });
      const orderNumber = formatOrderNumber(year, "PRIMARY", seq.lastValue);
      await tx.request.update({ where: { id: requestId }, data: { status: "ORDER_CREATED", orderNumber } });
      await tx.requestHistory.create({
        data: { requestId, step: historySteps.orderCreated(orderNumber), actorUserId: null, actorDisplayName: HR_ACTOR },
      });
      await tx.requestHistory.create({
        data: {
          requestId,
          step: historySteps.orderSigned(orderNumber, org.directorName),
          actorUserId: null,
          actorDisplayName: HR_ACTOR,
        },
      });
      return { orderNumber };
    });

    const directorSignatureUrl = org.directorSignatureKey ? await this.toDataUri(org.directorSignatureKey) : null;
    const data = buildOrderDocumentData(
      { start: toISODate(request.start), end: toISODate(request.end), days: request.days },
      { name: request.employee.name, hireDate: toISODate(request.employee.hireDate) },
      org,
      orderNumber,
      todayInYerevan(),
      true,
      directorSignatureUrl,
    );
    const pdf = await this.orderPdf.renderPdf(data);

    const employeeText = notifications.orderSignedForEmployee(orderNumber, request.employee.email);
    const hrText = notifications.orderSignedForHR(orderNumber, request.employee.name, org.hrEmail);

    await this.emailService.sendPdf(request.employee.email, `Հրաման ${orderNumber}`, employeeText, pdf, `${orderNumber}.pdf`);
    if (org.hrEmail) {
      await this.emailService.sendPdf(org.hrEmail, `Հրաման ${orderNumber}`, hrText, pdf, `${orderNumber}.pdf`);
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.notificationsService.notifyEmployee(tx, request.employeeId, employeeText, requestId);
      await this.notificationsService.notifyRole(tx, "HR", hrText, requestId);
    });

    return { orderNumber, pdfBase64: pdf.toString("base64") };
  }

  /** Regenerates the (deterministic) signed PDF for an already-created order — backs the
   * web app's "download PDF" button, replacing the prototype's `window.print()`. */
  async renderExistingOrderPdf(requestId: string): Promise<Buffer> {
    const request = await this.getRequestForOrder(requestId);
    if (request.status !== "ORDER_CREATED" || !request.orderNumber) {
      throw new NotFoundException("Հրամանը դեռ կազմված չէ։");
    }
    const org = await this.orgSettings.get();
    const directorSignatureUrl = org.directorSignatureKey ? await this.toDataUri(org.directorSignatureKey) : null;
    const data = buildOrderDocumentData(
      { start: toISODate(request.start), end: toISODate(request.end), days: request.days },
      { name: request.employee.name, hireDate: toISODate(request.employee.hireDate) },
      org,
      request.orderNumber,
      todayInYerevan(),
      true,
      directorSignatureUrl,
    );
    return this.orderPdf.renderPdf(data);
  }
}
