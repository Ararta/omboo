import { Controller, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { PlatformAdminTransactionInterceptor } from "../../common/interceptors/platform-admin-transaction.interceptor";
import { InvoicesAdminService } from "./invoices.admin.service";

@Controller("platform-admin/invoices")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@UseInterceptors(PlatformAdminTransactionInterceptor)
export class InvoicesAdminController {
  constructor(private readonly invoicesAdmin: InvoicesAdminService) {}

  @Post(":id/mark-paid")
  markPaid(@Param("id") id: string) {
    return this.invoicesAdmin.markPaid(id);
  }
}
