import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./session";

// Unlike apps/web (which proxies through its own same-origin route to keep tokens out of
// browser JS), the mobile app has no cookie jar or CSRF surface to worry about — it talks to
// the Nest API directly and keeps tokens in expo-secure-store (OS keychain/keystore).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  employeeId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

// Mirrors apps/api's AuthService.LoginResult union — HR/DIRECTOR accounts go through TOTP
// two-factor before a session is issued, so a plain email+password submit doesn't always come
// back with tokens directly.
export type LoginResult =
  | TokenPair
  | { totpSetupRequired: true; setupToken: string; qrCodeDataUrl: string; secret: string }
  | { requiresTotp: true; challengeToken: string };

async function refresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    return false;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  await setTokens(data.accessToken, data.refreshToken);
  return true;
}

async function request<T>(method: string, path: string, body?: unknown, allowRetry = true): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && allowRetry) {
    const refreshed = await refresh();
    if (refreshed) return request<T>(method, path, body, false);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message ?? "Սերվերի սխալ, փորձեք կրկին։");
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};

async function postAuth(path: string, body: unknown): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LoginResult & { message?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, data.code, (data as { message?: string }).message ?? "Մուտքը ձախողվեց։");
  if ("accessToken" in data) await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return postAuth("login", { email, password });
}

export function confirmTotpSetup(setupToken: string, code: string): Promise<LoginResult> {
  return postAuth("totp/setup-confirm", { setupToken, code });
}

export function verifyTotp(challengeToken: string, code: string): Promise<LoginResult> {
  return postAuth("totp/verify", { challengeToken, code });
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  await clearTokens();
}
