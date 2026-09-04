import { Module } from "@nestjs/common";
import { MarketingAssetsModule } from "../marketing-assets/marketing-assets.module";
import { PackagesController } from "./packages.controller";
import { PackagesService } from "./packages.service";
import { CommissionRatesController } from "./commission-rates.controller";
import { CommissionRatesService } from "./commission-rates.service";
import { MarketingAssetsAdminController } from "./marketing-assets.admin.controller";
import { PartnersOverviewController } from "./partners-overview.controller";
import { PartnersOverviewService } from "./partners-overview.service";
import { InvoicesAdminController } from "./invoices.admin.controller";
import { InvoicesAdminService } from "./invoices.admin.service";

@Module({
  imports: [MarketingAssetsModule],
  controllers: [PackagesController, CommissionRatesController, MarketingAssetsAdminController, PartnersOverviewController, InvoicesAdminController],
  providers: [PackagesService, CommissionRatesService, PartnersOverviewService, InvoicesAdminService],
})
export class PlatformAdminModule {}
