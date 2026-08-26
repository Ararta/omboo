import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { documentUploadMetaSchema, type DocumentUploadMetaInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { DocumentsService } from "./documents.service";

@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @Roles("HR")
  list(@Query("employeeId") employeeId?: string) {
    return this.documents.listAll(employeeId);
  }

  @Get("mine")
  mine(@CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
    return this.documents.listMine(user.employeeId);
  }

  @Post()
  @Roles("HR")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  upload(
    @Body(new ZodValidationPipe(documentUploadMetaSchema)) meta: DocumentUploadMetaInput,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.upload(meta, file, user.userId);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.downloadUrl(id, user.employeeId, user.role === "HR");
  }

  @Delete(":id")
  @Roles("HR")
  async delete(@Param("id") id: string) {
    await this.documents.delete(id);
    return { ok: true };
  }
}
