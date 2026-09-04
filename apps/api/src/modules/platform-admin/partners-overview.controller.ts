import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { PlatformAdminTransactionInterceptor } from "../../common/interceptors/platform-admin-transaction.interceptor";
import { PartnersOverviewService } from "./partners-overview.service";

@Controller("platform-admin/partners-overview")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@UseInterceptors(PlatformAdminTransactionInterceptor)
export class PartnersOverviewController {
  constructor(private readonly partnersOverview: PartnersOverviewService) {}

  @Get("partners")
  listPartners() {
    return this.partnersOverview.listPartners();
  }

  @Get("orders")
  listOrders() {
    return this.partnersOverview.listOrders();
  }
}
