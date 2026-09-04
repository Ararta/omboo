import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { runWithPartnerId } from "@omboo/database";
import type { PartnerJwtPayload } from "../../modules/partner-auth/partner-jwt.strategy";

// Partner-portal counterpart to tenant-context.middleware.ts — runs before PartnerJwtAuthGuard,
// verifying the access token itself (own secret, PARTNER_JWT_ACCESS_SECRET) purely to read
// partnerId and populate the AsyncLocalStorage context the partner-scope Prisma extension reads
// from. Never rejects the request: an invalid/missing/expired token here just means no partner
// context gets set, and PartnerJwtAuthGuard (later in the pipeline) is what actually enforces
// authentication on protected partner routes. A request carrying an org JWT instead simply fails
// to verify against this secret and falls through with no partner context — safe no-op.
@Injectable()
export class PartnerContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) return next();

    try {
      const payload = this.jwtService.verify<PartnerJwtPayload>(token, {
        secret: process.env.PARTNER_JWT_ACCESS_SECRET ?? "change-me-partner-access-secret-dev-only",
      });
      if (payload.partnerId) {
        return runWithPartnerId(payload.partnerId, () => next());
      }
    } catch {
      // Invalid/expired token, or a token signed for a different secret (e.g. an org JWT) —
      // fall through with no partner context; PartnerJwtAuthGuard rejects protected routes.
    }
    next();
  }
}
