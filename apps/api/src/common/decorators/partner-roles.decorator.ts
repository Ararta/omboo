import { SetMetadata } from "@nestjs/common";
import type { PartnerRole } from "@omboo/shared";

export const PARTNER_ROLES_KEY = "partnerRoles";
export const PartnerRoles = (...roles: PartnerRole[]) => SetMetadata(PARTNER_ROLES_KEY, roles);
