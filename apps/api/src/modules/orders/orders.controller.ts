import { Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("HR")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(":requestId/preview")
  preview(@Param("requestId") requestId: string) {
    return this.orders.openOrderPreview(requestId);
  }

  @Post(":requestId/confirm")
  confirm(@Param("requestId") requestId: string) {
    return this.orders.confirmAndSignOrder(requestId);
  }

  @Get(":requestId/pdf")
  async downloadPdf(@Param("requestId") requestId: string, @Res() res: Response) {
    const pdf = await this.orders.renderExistingOrderPdf(requestId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="order-${requestId}.pdf"`);
    res.send(pdf);
  }
}
