import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { PartnerRole } from "@omboo/shared";

// Partner-portal counterpart to apps/api/src/modules/auth/jwt.strategy.ts — a fully separate
// named Passport strategy ("partner-jwt"), own secret, own payload shape (partnerId instead of
// organizationId, no employeeId/role-in-the-org-sense). See PartnerJwtAuthGuard, which extends
// AuthGuard("partner-jwt") the same way JwtAuthGuard extends AuthGuard("jwt").
export interface PartnerJwtPayload {
  sub: string; // PartnerUser.id
  partnerId: string;
  role: PartnerRole;
}

export interface AuthenticatedPartnerUser {
  partnerUserId: string;
  partnerId: string;
  role: PartnerRole;
}

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, "partner-jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.PARTNER_JWT_ACCESS_SECRET ?? "change-me-partner-access-secret-dev-only",
    });
  }

  validate(payload: PartnerJwtPayload): AuthenticatedPartnerUser {
    return {
      partnerUserId: payload.sub,
      partnerId: payload.partnerId,
      role: payload.role,
    };
  }
}
