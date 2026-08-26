import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { RecallsModule } from "./modules/recalls/recalls.module";
import { RemindersModule } from "./modules/reminders/reminders.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrgSettingsModule } from "./modules/org-settings/org-settings.module";
import { StorageModule } from "./modules/storage/storage.module";
import { EmailModule } from "./modules/email/email.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    RequestsModule,
    OrdersModule,
    RecallsModule,
    RemindersModule,
    NotificationsModule,
    OrgSettingsModule,
    StorageModule,
    EmailModule,
    AttendanceModule,
  ],
})
export class AppModule {}
