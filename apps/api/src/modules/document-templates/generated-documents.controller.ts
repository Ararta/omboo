import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { generateDocumentSchema, generatedDocumentStatusSchema, type GenerateDocumentInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { GeneratedDocumentsService } from "./generated-documents.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeneratedDocumentsController {
  constructor(private readonly generatedDocuments: GeneratedDocumentsService) {}

  @Post("document-templates/:id/generate")
  @Roles("HR")
  generate(
    @Param("id") templateId: string,
    @Body(new ZodValidationPipe(generateDocumentSchema)) dto: GenerateDocumentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.generatedDocuments.generate(templateId, dto, user.userId);
  }

  @Get("generated-documents")
  @Roles("HR")
  list(@Query("category") category?: string, @Query("status") status?: string) {
    const parsedStatus = status ? generatedDocumentStatusSchema.safeParse(status) : undefined;
    return this.generatedDocuments.listAll({ category, status: parsedStatus?.success ? parsedStatus.data : undefined });
  }

  @Get("generated-documents/mine")
  mine(@CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
    return this.generatedDocuments.listMine(user.employeeId);
  }

  @Get("generated-documents/pending-director")
  @Roles("DIRECTOR")
  pendingForDirector() {
    return this.generatedDocuments.listPendingForDirector();
  }

  @Get("generated-documents/:id")
  async getOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const doc = await this.generatedDocuments.findByIdOrThrow(id);
    if (user.role === "EMPLOYEE" && doc.employeeId !== user.employeeId) {
      throw new ForbiddenException("Այս փաստաթուղթը Ձեզ չի պատկանում։");
    }
    return doc;
  }

  @Post("generated-documents/:id/sign-employee")
  @Roles("EMPLOYEE")
  signAsEmployee(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocuments.signAsEmployee(id, user);
  }

  @Post("generated-documents/:id/sign-director")
  @Roles("DIRECTOR")
  signAsDirector(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatedDocuments.signAsDirector(id, user);
  }

  @Post("generated-documents/:id/cancel")
  @Roles("HR")
  async cancel(@Param("id") id: string) {
    await this.generatedDocuments.cancel(id);
    return { ok: true };
  }
}
