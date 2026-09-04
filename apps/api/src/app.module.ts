import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { PartnerPrismaModule } from "./common/prisma/partner-prisma.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { PartnerContextMiddleware } from "./common/middleware/partner-context.middleware";
import { TenantTransactionInterceptor } from "./common/interceptors/tenant-transaction.interceptor";
import { PartnerTenantTransactionInterceptor } from "./common/interceptors/partner-tenant-transaction.interceptor";
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
import { DocumentTemplatesModule } from "./modules/document-templates/document-templates.module";
import { PartnerAuthModule } from "./modules/partner-auth/partner-auth.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
import { DealsModule } from "./modules/deals/deals.module";
import { PartnersModule } from "./modules/partners/partners.module";

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
    PartnerPrismaModule,
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
    DocumentTemplatesModule,
    PartnerAuthModule,
    PlatformAdminModule,
    DealsModule,
    PartnersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PartnerTenantTransactionInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware, PartnerContextMiddleware).forRoutes("*");
  }
}
