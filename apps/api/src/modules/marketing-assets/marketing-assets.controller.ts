import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PartnerJwtAuthGuard } from "../../common/guards/partner-jwt-auth.guard";
import { MarketingAssetsService } from "./marketing-assets.service";

// Partner-facing read side — every partner sees the same global list, no role restriction
// needed beyond being an authenticated partner (PartnerRole has just OWNER today anyway).
@Controller("marketing-assets")
@UseGuards(PartnerJwtAuthGuard)
export class MarketingAssetsController {
  constructor(private readonly marketingAssets: MarketingAssetsService) {}

  @Get()
  list() {
    return this.marketingAssets.list();
  }

  @Get(":id/download")
  download(@Param("id") id: string) {
    return this.marketingAssets.downloadUrl(id);
  }
}
