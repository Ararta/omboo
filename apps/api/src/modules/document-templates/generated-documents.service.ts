import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { getOrgId } from "@omboo/database";
import {
  fmtDateHY,
  notifications,
  PLACEHOLDER_RE,
  todayInYerevan,
  type GenerateDocumentInput,
  type GeneratedDocumentStatus,
} from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrgSettingsService } from "../org-settings/org-settings.service";
import { StorageService } from "../storage/storage.service";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { toISODate } from "../requests/request-mappers";
import { DocumentTemplatesService } from "./document-templates.service";
import { GeneratedDocumentPdfService } from "./generated-document-pdf.service";

function fmtSignedAt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Injectable()
export class GeneratedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: DocumentTemplatesService,
    private readonly orgSettings: OrgSettingsService,
    private readonly storage: StorageService,
    private readonly notificationsService: NotificationsService,
    private readonly pdf: GeneratedDocumentPdfService,
  ) {}

  /** HR-only overview, optionally filtered. */
  listAll(filter: { category?: string; status?: GeneratedDocumentStatus }) {
    return this.prisma.client.generatedDocument.findMany({
      where: { category: filter.category as never, status: filter.status },
      include: { employee: { select: { id: true, name: true, position: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Employee self-service — every document generated for them, most recent first. */
  listMine(employeeId: string) {
    return this.prisma.client.generatedDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
  }

  listPendingForDirector() {
    return this.prisma.client.generatedDocument.findMany({
      where: { status: "PENDING_DIRECTOR_SIGNATURE" },
      include: { employee: { select: { id: true, name: true, position: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByIdOrThrow(id: string) {
    const doc = await this.prisma.client.generatedDocument.findUnique({
      where: { id },
      include: { employee: { select: { id: true, name: true, position: true } }, template: { select: { name: true } } },
    });
    if (!doc) throw new NotFoundException("Փաստաթուղթը չի գտնվել։");
    return doc;
  }

  /** Fills a template's {{placeholders}} — known ones (employeeName, companyName, ...) from
   * Employee/OrgSettings data, everything else from the caller-supplied customFields — and
   * files the result as a new GeneratedDocument awaiting the employee's signature. Any
   * placeholder that's neither known nor supplied is left as literal text rather than silently
   * blanked, so a missing custom field is obvious in the generated document instead of invisible. */
  async generate(templateId: string, dto: GenerateDocumentInput, userId: string) {
    const organizationId = getOrgId();
    const template = await this.templates.findByIdOrThrow(templateId);
    const employee = await this.prisma.client.employee.findUniqueOrThrow({ where: { id: dto.employeeId } });
    const org = await this.orgSettings.get();

    const known: Record<string, string> = {
      employeeName: employee.name,
      employeePosition: employee.position,
      employeeHireDate: fmtDateHY(toISODate(employee.hireDate)),
      employeeEmail: employee.email,
      companyName: org.companyName,
      companyAddress: org.address,
      directorName: org.directorName,
      hrName: org.hrName,
      today: fmtDateHY(todayInYerevan()),
    };

    const contentHtml = template.contentHtml.replace(PLACEHOLDER_RE, (full, name: string) => {
      if (name in known) return known[name] ?? full;
      if (name in dto.customFields) return dto.customFields[name] ?? full;
      return full;
    });

    const tx = this.prisma.client;
    const doc = await tx.generatedDocument.create({
      data: {
        organizationId,
        templateId,
        employeeId: dto.employeeId,
        title: template.name,
        category: template.category,
        contentHtml,
        createdByUserId: userId,
      },
    });
    await this.notificationsService.notifyEmployee(tx, dto.employeeId, notifications.documentPendingEmployeeSignature(doc.title));
    return doc;
  }

  async signAsEmployee(id: string, user: AuthenticatedUser) {
    const doc = await this.findByIdOrThrow(id);
    if (doc.employeeId !== user.employeeId) throw new ForbiddenException("Այս փաստաթուղթը Ձեզ չի պատկանում։");
    if (doc.status !== "PENDING_EMPLOYEE_SIGNATURE") {
      throw new ForbiddenException("Այս փաստաթուղթը այժմ Ձեր ստորագրության չի սպասում։");
    }

    const tx = this.prisma.client;
    const updated = await tx.generatedDocument.update({
      where: { id },
      data: { status: "PENDING_DIRECTOR_SIGNATURE", employeeSignedAt: new Date(), employeeSignedByUserId: user.userId },
    });
    await this.notificationsService.notifyRole(tx, "DIRECTOR", notifications.documentPendingDirectorSignature(doc.title, doc.employee.name));
    return updated;
  }

  async signAsDirector(id: string, user: AuthenticatedUser) {
    const doc = await this.findByIdOrThrow(id);
    if (doc.status !== "PENDING_DIRECTOR_SIGNATURE" || !doc.employeeSignedAt) {
      throw new ForbiddenException("Այս փաստաթուղթը այժմ Ձեր ստորագրության չի սպասում։");
    }

    const org = await this.orgSettings.get();
    const directorSignedAt = new Date();

    const pdf = await this.pdf.renderPdf({
      title: doc.title,
      contentHtml: doc.contentHtml,
      companyName: org.companyName,
      employeeName: doc.employee.name,
      employeeSignedAtHY: fmtSignedAt(doc.employeeSignedAt),
      directorName: org.directorName,
      directorSignedAtHY: fmtSignedAt(directorSignedAt),
    });

    const organizationId = getOrgId();
    const key = `documents/${organizationId}/${doc.employeeId}/generated-${doc.id}-${Date.now()}.pdf`;
    await this.storage.uploadObject(key, pdf, "application/pdf");

    const tx = this.prisma.client;
    const finalDoc = await tx.employeeDocument.create({
      data: {
        organizationId,
        employeeId: doc.employeeId,
        title: doc.title,
        category: doc.category,
        fileKey: key,
        fileName: `${doc.title}.pdf`,
        mimeType: "application/pdf",
        fileSize: pdf.length,
        uploadedByUserId: user.userId,
      },
    });
    const updated = await tx.generatedDocument.update({
      where: { id },
      data: {
        status: "COMPLETED",
        directorSignedAt,
        directorSignedByUserId: user.userId,
        finalDocumentId: finalDoc.id,
      },
    });

    await this.notificationsService.notifyEmployee(tx, doc.employeeId, notifications.documentCompletedForEmployee(doc.title));
    await this.notificationsService.notifyRole(tx, "HR", notifications.documentCompletedForHR(doc.title, doc.employee.name));
    return updated;
  }

  async cancel(id: string): Promise<void> {
    const doc = await this.findByIdOrThrow(id);
    if (doc.status === "COMPLETED") throw new ForbiddenException("Ավարտված փաստաթուղթը հնարավոր չէ չեղարկել։");
    await this.prisma.client.generatedDocument.update({ where: { id }, data: { status: "CANCELLED" } });
  }
}
