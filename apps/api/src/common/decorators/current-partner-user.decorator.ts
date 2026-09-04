import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedPartnerUser } from "../../modules/partner-auth/partner-jwt.strategy";

export const CurrentPartnerUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedPartnerUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
