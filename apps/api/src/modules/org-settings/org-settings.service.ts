import { Injectable, NotFoundException } from "@nestjs/common";
import type { OrgSettings } from "@omboo/database";
import type { OrgSettingsInput } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

function extFromMime(mimetype: string): string {
  if (mimetype === "image/png") return "png";
  if (mimetype === "image/jpeg") return "jpg";
  if (mimetype === "image/webp") return "webp";
  return "bin";
}

@Injectable()
export class OrgSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async get() {
    const existing = await this.prisma.client.orgSettings.findUnique({ where: { id: 1 } });
    if (!existing) throw new NotFoundException("Կազմակերպության կարգավորումները դեռ սահմանված չեն։");
    return this.withSignatureUrl(existing);
  }

  async update(dto: OrgSettingsInput) {
    const updated = await this.prisma.client.orgSettings.update({ where: { id: 1 }, data: dto });
    return this.withSignatureUrl(updated);
  }

  async uploadSignature(file: Express.Multer.File) {
    const key = `director-signature-${Date.now()}.${extFromMime(file.mimetype)}`;
    await this.storage.uploadObject(key, file.buffer, file.mimetype);
    const updated = await this.prisma.client.orgSettings.update({
      where: { id: 1 },
      data: { directorSignatureKey: key },
    });
    return this.withSignatureUrl(updated);
  }

  /** Internal, non-presigned accessor used by the order-PDF pipeline, which base64-embeds
   * the signature directly into the rendered HTML rather than linking a presigned URL
   * (avoids CORS/expiry complications inside headless Chromium). */
  async getSignatureBuffer(key: string): Promise<Buffer> {
    return this.storage.getObjectBuffer(key);
  }

  private async withSignatureUrl(org: OrgSettings) {
    const directorSignatureUrl = org.directorSignatureKey ? await this.storage.presignGet(org.directorSignatureKey, 3600) : null;
    return { ...org, directorSignatureUrl };
  }
}
