"use client";

export class PartnerApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "PartnerApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/partner-proxy${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new PartnerApiError(res.status, data?.code, data?.message ?? "Սերվերի սխալ, փորձեք կրկին։");
  }
  return data as T;
}

export const partnerApi = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
