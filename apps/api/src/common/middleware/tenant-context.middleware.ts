import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { runWithOrgId } from "@omboo/database";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

// Runs before JwtAuthGuard (guards can't wrap the downstream pipeline the way middleware can), so
// it verifies the access token itself — same secret JwtStrategy uses — purely to read
// organizationId and populate the AsyncLocalStorage context the tenant-scope Prisma extension
// reads from (see packages/database/src/tenant-scope.ts). It never rejects the request: an
// invalid/missing/expired token here just means no tenant context gets set, and JwtAuthGuard
// (which runs later, in the normal Nest pipeline) is what actually enforces authentication on
// protected routes. Public routes (login, register-organization) simply run with no org context,
// which is correct — they don't have one yet.
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) return next();

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only",
      });
      if (payload.organizationId) {
        return runWithOrgId(payload.organizationId, () => next());
      }
    } catch {
      // Invalid/expired token — fall through unscoped; JwtAuthGuard rejects protected routes.
    }
    next();
  }
}
