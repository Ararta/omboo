import { Controller, Get, UseGuards } from "@nestjs/common";
import { PartnerJwtAuthGuard } from "../../common/guards/partner-jwt-auth.guard";
import { PartnersService } from "./partners.service";

@Controller("partners")
@UseGuards(PartnerJwtAuthGuard)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get("me")
  me() {
    return this.partners.me();
  }

  @Get("me/overview")
  overview() {
    return this.partners.overview();
  }
}
