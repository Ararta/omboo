import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreatePackageInput, UpdatePackageInput } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";

// Package/PackagePrice are platform-global (no organizationId, no partnerId) — managed only
// through Platform Admin. Reads plain PrismaService.client, which is unaffected by either
// tenant-scope or partner-scope extension since neither model is in their respective
// TENANT_MODELS/PARTNER_MODELS sets.
@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.package.findMany({
      include: { prices: true },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreatePackageInput) {
    const existing = await this.prisma.client.package.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException("Այս key-ով փաթեթ արդեն գոյություն ունի։");

    return this.prisma.client.package.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        prices: { create: dto.prices },
      },
      include: { prices: true },
    });
  }

  async update(id: string, dto: UpdatePackageInput) {
    const existing = await this.prisma.client.package.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Փաթեթը չի գտնվել։");

    if (dto.prices) {
      // Replace the price set wholesale — simpler and safer than diffing individual cycles,
      // and PackagePrice rows carry no history that would be lost (Order snapshots its own
      // price at creation time, so this never retroactively changes a placed order).
      await this.prisma.client.packagePrice.deleteMany({ where: { packageId: id } });
    }

    return this.prisma.client.package.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        prices: dto.prices ? { create: dto.prices } : undefined,
      },
      include: { prices: true },
    });
  }
}
