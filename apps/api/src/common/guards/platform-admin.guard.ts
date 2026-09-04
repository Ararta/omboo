import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../modules/auth/jwt.strategy";

// Gates the B2B Partner Portal's Platform Admin endpoints (global commission-rate table,
// package pricing, marketing materials). Uses the org-side JwtAuthGuard's AuthenticatedUser
// (Omboo's own team manages these through their existing DIRECTOR login), never the partner
// JWT — a partner should never reach these routes regardless of role. Always pair with
// JwtAuthGuard (this guard assumes request.user is already populated).
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    return !!user && user.role === "DIRECTOR" && user.isPlatformOwner === true;
  }
}
