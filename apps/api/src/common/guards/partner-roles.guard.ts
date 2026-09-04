import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PartnerRole } from "@omboo/shared";
import { PARTNER_ROLES_KEY } from "../decorators/partner-roles.decorator";

@Injectable()
export class PartnerRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PartnerRole[] | undefined>(PARTNER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: PartnerRole } | undefined;
    return !!user?.role && requiredRoles.includes(user.role);
  }
}
