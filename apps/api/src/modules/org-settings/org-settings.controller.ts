import { Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { geofenceSettingsSchema, orgSettingsSchema, type GeofenceSettingsInput, type OrgSettingsInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { OrgSettingsService } from "./org-settings.service";

@Controller("org-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgSettingsController {
  constructor(private readonly orgSettings: OrgSettingsService) {}

  @Get()
  get() {
    return this.orgSettings.get();
  }

  @Patch()
  @Roles("HR")
  update(@Body(new ZodValidationPipe(orgSettingsSchema)) dto: OrgSettingsInput) {
    return this.orgSettings.update(dto);
  }

  @Patch("geofence")
  @Roles("HR")
  updateGeofence(@Body(new ZodValidationPipe(geofenceSettingsSchema)) dto: GeofenceSettingsInput) {
    return this.orgSettings.updateGeofence(dto);
  }

  @Post("signature")
  @Roles("HR")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadSignature(@UploadedFile() file: Express.Multer.File) {
    return this.orgSettings.uploadSignature(file);
  }
}
