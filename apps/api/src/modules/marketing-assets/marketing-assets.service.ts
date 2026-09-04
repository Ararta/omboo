import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

// MarketingAsset is platform-global (visible to every partner, writable only through Platform
// Admin) — same S3-metadata-row pattern as EmployeeDocument/DocumentsService, but with no
// organizationId/partnerId at all.
@Injectable()
export class MarketingAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list() {
    return this.prisma.client.marketingAsset.findMany({ orderBy: { createdAt: "desc" } });
  }

  async upload(title: string, description: string | undefined, file: Express.Multer.File, uploadedByUserId: string) {
    const key = `marketing-assets/${Date.now()}-${file.originalname}`;
    await this.storage.uploadObject(key, file.buffer, file.mimetype);

    return this.prisma.client.marketingAsset.create({
      data: {
        title,
        description,
        fileKey: key,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId,
      },
    });
  }

  async downloadUrl(id: string): Promise<{ url: string; fileName: string }> {
    const asset = await this.prisma.client.marketingAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Ֆայլը չի գտնվել։");
    const url = await this.storage.presignGet(asset.fileKey, 300);
    return { url, fileName: asset.fileName };
  }

  async delete(id: string): Promise<void> {
    const asset = await this.prisma.client.marketingAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Ֆայլը չի գտնվել։");
    await this.storage.deleteObject(asset.fileKey);
    await this.prisma.client.marketingAsset.delete({ where: { id } });
  }
}
