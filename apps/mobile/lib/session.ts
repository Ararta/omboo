import { Platform } from "react-native";
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

// expo-secure-store has no browser backing (no OS keychain to call into) — Expo's own
// guidance for the web target is to fall back to another storage mechanism. localStorage is
// not as safe as the native keychain, but it's the standard fallback and only applies when
// running `expo start --web`; iOS/Android builds always use the real SecureStore.
const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setItem(ACCESS_KEY, accessToken);
  await setItem(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
}

export function decodeSession(token: string | null): SessionPayload | null {
  if (!token) return null;
  const payload = decodeJwtPayload<SessionPayload>(token);
  if (!payload?.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}
