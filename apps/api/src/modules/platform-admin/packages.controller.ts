import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { createPackageSchema, updatePackageSchema, type CreatePackageInput, type UpdatePackageInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PackagesService } from "./packages.service";

@Controller("platform-admin/packages")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  list() {
    return this.packages.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPackageSchema)) dto: CreatePackageInput) {
    return this.packages.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updatePackageSchema)) dto: UpdatePackageInput) {
    return this.packages.update(id, dto);
  }
}
