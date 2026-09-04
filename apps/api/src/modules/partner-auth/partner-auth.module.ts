import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PartnerAuthController } from "./partner-auth.controller";
import { PartnerAuthService } from "./partner-auth.service";
import { PartnerJwtStrategy } from "./partner-jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.PARTNER_JWT_ACCESS_SECRET ?? "change-me-partner-access-secret-dev-only",
      signOptions: { expiresIn: process.env.PARTNER_JWT_ACCESS_TTL ?? "15m" },
    }),
  ],
  controllers: [PartnerAuthController],
  providers: [PartnerAuthService, PartnerJwtStrategy],
  exports: [PartnerAuthService],
})
export class PartnerAuthModule {}
