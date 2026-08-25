import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RecallsController } from "./recalls.controller";
import { RecallsService } from "./recalls.service";

@Module({
  imports: [NotificationsModule],
  controllers: [RecallsController],
  providers: [RecallsService],
  exports: [RecallsService],
})
export class RecallsModule {}
