import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { createOrderSchema, type CreateOrderInput } from "@omboo/shared";
import { PartnerJwtAuthGuard } from "../../common/guards/partner-jwt-auth.guard";
import { CurrentPartnerUser } from "../../common/decorators/current-partner-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedPartnerUser } from "../partner-auth/partner-jwt.strategy";
import { DealsService } from "./deals.service";

@Controller("deals")
@UseGuards(PartnerJwtAuthGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  list() {
    return this.deals.list();
  }

  // Declared before ":id" so Nest matches this literal segment first.
  @Get("packages")
  listPackages() {
    return this.deals.listPackages();
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.deals.getOne(id);
  }

  @Get(":id/invoice/download")
  invoiceDownload(@Param("id") id: string) {
    return this.deals.invoiceDownloadUrl(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderInput, @CurrentPartnerUser() user: AuthenticatedPartnerUser) {
    return this.deals.create(dto, user.partnerUserId);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(@Param("id") id: string) {
    return this.deals.cancel(id);
  }
}
