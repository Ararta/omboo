import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Role } from "@omboo/shared";

export interface JwtPayload {
  sub: string;
  role: Role;
  employeeId: string | null;
  organizationId: string;
  // Grants access to the Platform Admin section (B2B Partner Portal's global commission-rate
  // table, package pricing, marketing materials) — true only for the one org that manages
  // those, never user-editable. See PlatformAdminGuard.
  isPlatformOwner: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  employeeId: string | null;
  organizationId: string;
  isPlatformOwner: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only",
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      role: payload.role,
      employeeId: payload.employeeId,
      organizationId: payload.organizationId,
      isPlatformOwner: payload.isPlatformOwner,
    };
  }
}
