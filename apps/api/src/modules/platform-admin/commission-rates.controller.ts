import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { setCommissionRatesSchema, type SetCommissionRatesInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { CommissionRatesService } from "./commission-rates.service";

@Controller("platform-admin/commission-rates")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class CommissionRatesController {
  constructor(private readonly commissionRates: CommissionRatesService) {}

  @Get()
  list() {
    return this.commissionRates.list();
  }

  @Post()
  setForPackage(
    @Body(new ZodValidationPipe(setCommissionRatesSchema)) dto: SetCommissionRatesInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commissionRates.setForPackage(dto, user.userId);
  }
}
