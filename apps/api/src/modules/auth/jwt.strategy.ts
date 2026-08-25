import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Role } from "@omboo/shared";

export interface JwtPayload {
  sub: string;
  role: Role;
  employeeId: string | null;
}

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  employeeId: string | null;
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
    return { userId: payload.sub, role: payload.role, employeeId: payload.employeeId };
  }
}
