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

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; employeeId: string | null };
}

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

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResult & { message?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, data.code, data.message ?? "Մուտքը ձախողվեց։");
  await setTokens(data.accessToken, data.refreshToken);
  return data.user;
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
