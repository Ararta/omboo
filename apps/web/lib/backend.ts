const NEST_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function backendUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${NEST_API_URL}/api${normalized}`;
}
