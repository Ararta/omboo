import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrgSettingsModule } from "../org-settings/org-settings.module";
import { EmailModule } from "../email/email.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderPdfService } from "./order-pdf.service";

@Module({
  imports: [NotificationsModule, OrgSettingsModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfService],
  exports: [OrdersService],
})
export class OrdersModule {}
