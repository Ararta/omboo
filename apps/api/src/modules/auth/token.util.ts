import { createHash, randomBytes } from "node:crypto";

/** Opaque, high-entropy refresh token. Only its hash is ever persisted. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTtlMs(): number {
  const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
  return days * 24 * 60 * 60 * 1000;
}
