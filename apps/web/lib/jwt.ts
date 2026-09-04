import { decodeJwt } from "jose";
import type { Role } from "@omboo/shared";

// Pure, framework-agnostic — safe to import from both middleware (Edge runtime) and
// Server Components/Route Handlers. Signature verification happens on every request at the
// Nest API (the source of truth); this is UX-only (avoiding a flash of the wrong role's
// content), matching the "server always re-validates" principle used for business rules.

export const ACCESS_COOKIE = "omboo_access_token";
export const REFRESH_COOKIE = "omboo_refresh_token";

export interface SessionPayload {
  sub: string;
  role: Role;
  employeeId: string | null;
  // Grants access to the Platform Admin section of the DIRECTOR dashboard (B2B Partner
  // Portal's global commission-rate table, package pricing, marketing materials).
  isPlatformOwner: boolean;
  exp: number;
}

export function decodeSession(accessToken: string | undefined | null): SessionPayload | null {
  if (!accessToken) return null;
  try {
    const payload = decodeJwt(accessToken) as unknown as SessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const ROLE_HOME: Record<Role, string> = {
  EMPLOYEE: "/employee/requests",
  DIRECTOR: "/director",
  HR: "/hr",
};

export const ROLE_PREFIX: Record<Role, string> = {
  EMPLOYEE: "/employee",
  DIRECTOR: "/director",
  HR: "/hr",
};
