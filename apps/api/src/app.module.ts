import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
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
import { DocumentsModule } from "./modules/documents/documents.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global default: 100 requests / minute / IP. Auth endpoints (login, register, TOTP) set
    // their own much tighter @Throttle() to blunt credential-stuffing / brute-force attempts.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Separate registration from AuthModule's — used only by TenantContextMiddleware to verify
    // the access token and read organizationId, same secret as JwtStrategy.
    JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only" }),
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
    DocumentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
