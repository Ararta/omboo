import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, getOrgId } from "@omboo/database";
import {
  KNOWN_PLACEHOLDER_FIELDS,
  PLACEHOLDER_RE,
  type CreateTemplateInput,
  type TemplateCategory,
  type UpdateTemplateInput,
} from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listByCategory(category?: TemplateCategory) {
    return this.prisma.client.documentTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async findByIdOrThrow(id: string) {
    const template = await this.prisma.client.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException("Ձևանմուշը չի գտնվել։");
    return template;
  }

  create(dto: CreateTemplateInput, userId: string) {
    return this.prisma.client.documentTemplate.create({
      data: {
        organizationId: getOrgId(),
        name: dto.name,
        category: dto.category,
        contentHtml: dto.contentHtml,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, dto: UpdateTemplateInput) {
    await this.findByIdOrThrow(id);
    return this.prisma.client.documentTemplate.update({ where: { id }, data: dto });
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    try {
      await this.prisma.client.documentTemplate.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new ConflictException("Այս ձևանմուշից արդեն ստեղծված են փաստաթղթեր, ուստի այն հնարավոր չէ ջնջել։");
      }
      throw e;
    }
  }

  /** Placeholder names found in the template that aren't one of the known auto-filled fields
   * (employeeName, companyName, ...) — the web app turns these into a small fill-in form when
   * generating a document from this template. */
  async findCustomFields(id: string): Promise<string[]> {
    const template = await this.findByIdOrThrow(id);
    const known = new Set<string>(KNOWN_PLACEHOLDER_FIELDS);
    const found = new Set<string>();
    for (const match of template.contentHtml.matchAll(PLACEHOLDER_RE)) {
      const name = match[1];
      if (name && !known.has(name)) found.add(name);
    }
    return [...found];
  }
}
