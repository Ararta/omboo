import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { marketingAssetUploadMetaSchema, type MarketingAssetUploadMetaInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { MarketingAssetsService } from "../marketing-assets/marketing-assets.service";

@Controller("platform-admin/marketing-assets")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class MarketingAssetsAdminController {
  constructor(private readonly marketingAssets: MarketingAssetsService) {}

  @Get()
  list() {
    return this.marketingAssets.list();
  }

  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @Body(new ZodValidationPipe(marketingAssetUploadMetaSchema)) meta: MarketingAssetUploadMetaInput,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingAssets.upload(meta.title, meta.description, file, user.userId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.marketingAssets.delete(id);
    return { ok: true };
  }
}
