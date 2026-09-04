import { decodeJwt } from "jose";
import type { PartnerRole } from "@omboo/shared";

// Partner-portal counterpart to lib/jwt.ts — deliberately separate cookie names from
// ACCESS_COOKIE/REFRESH_COOKIE so an org session and a partner session can coexist in the same
// browser without clobbering each other. Same "UX-only, server always re-validates" principle.

export const PARTNER_ACCESS_COOKIE = "omboo_partner_access_token";
export const PARTNER_REFRESH_COOKIE = "omboo_partner_refresh_token";
export const PARTNER_HOME = "/partner";

export interface PartnerSessionPayload {
  sub: string;
  partnerId: string;
  role: PartnerRole;
  exp: number;
}

export function decodePartnerSession(accessToken: string | undefined | null): PartnerSessionPayload | null {
  if (!accessToken) return null;
  try {
    const payload = decodeJwt(accessToken) as unknown as PartnerSessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
