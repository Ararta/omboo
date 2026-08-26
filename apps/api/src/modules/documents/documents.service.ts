import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { DocumentUploadMetaInput } from "@omboo/shared";
import { getOrgId } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** HR-only — every document across every employee, optionally filtered. */
  listAll(employeeId?: string) {
    return this.prisma.client.employeeDocument.findMany({
      where: { employeeId },
      include: { employee: { select: { id: true, name: true, position: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Employee self-service — only ever their own documents. */
  listMine(employeeId: string) {
    return this.prisma.client.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
  }

  async upload(meta: DocumentUploadMetaInput, file: Express.Multer.File, uploadedByUserId: string) {
    const organizationId = getOrgId();
    const employee = await this.prisma.client.employee.findUnique({ where: { id: meta.employeeId } });
    if (!employee) throw new NotFoundException("Աշխատողը չի գտնվել։");

    const key = `documents/${organizationId}/${meta.employeeId}/${Date.now()}-${randomBytes(4).toString("hex")}-${file.originalname}`;
    await this.storage.uploadObject(key, file.buffer, file.mimetype);

    return this.prisma.client.employeeDocument.create({
      data: {
        organizationId,
        employeeId: meta.employeeId,
        title: meta.title,
        category: meta.category,
        fileKey: key,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId,
      },
    });
  }

  /** Returns a short-lived presigned URL. Callers must already be authorized to see this
   * specific document (HR, or the owning employee) — enforced in the controller. */
  async downloadUrl(id: string, requesterEmployeeId: string | null, isHr: boolean) {
    const doc = await this.prisma.client.employeeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Փաստաթուղթը չի գտնվել։");
    if (!isHr && doc.employeeId !== requesterEmployeeId) throw new ForbiddenException("Հասանելի չէ։");
    const url = await this.storage.presignGet(doc.fileKey, 300);
    return { url, fileName: doc.fileName };
  }

  async delete(id: string): Promise<void> {
    const doc = await this.prisma.client.employeeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Փաստաթուղթը չի գտնվել։");
    await this.storage.deleteObject(doc.fileKey);
    await this.prisma.client.employeeDocument.delete({ where: { id } });
  }
}
