import * as SecureStore from "expo-secure-store";
import type { Role } from "@omboo/shared";
import { decodeJwtPayload } from "./jwt";

const ACCESS_KEY = "omboo_access_token";
const REFRESH_KEY = "omboo_refresh_token";

export interface SessionPayload {
  sub: string;
  role: Role;
  employeeId: string | null;
  exp: number;
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function decodeSession(token: string | null): SessionPayload | null {
  if (!token) return null;
  const payload = decodeJwtPayload<SessionPayload>(token);
  if (!payload?.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}
