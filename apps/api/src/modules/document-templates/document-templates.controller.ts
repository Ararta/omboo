import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { createTemplateSchema, templateCategorySchema, updateTemplateSchema, type CreateTemplateInput, type UpdateTemplateInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { DocumentTemplatesService } from "./document-templates.service";

@Controller("document-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("HR")
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @Get()
  list(@Query("category") category?: string) {
    const parsed = category ? templateCategorySchema.safeParse(category) : undefined;
    return this.templates.listByCategory(parsed?.success ? parsed.data : undefined);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.templates.findByIdOrThrow(id);
  }

  @Get(":id/custom-fields")
  customFields(@Param("id") id: string) {
    return this.templates.findCustomFields(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTemplateSchema)) dto: CreateTemplateInput, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.create(dto, user.userId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateTemplateSchema)) dto: UpdateTemplateInput) {
    return this.templates.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.templates.delete(id);
    return { ok: true };
  }
}
