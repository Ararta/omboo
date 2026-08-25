import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [NotificationsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
