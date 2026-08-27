// Pure host-parsing — safe in middleware (Edge runtime) and Route Handlers alike. Local dev uses
// <slug>.localhost:3000 (resolves with no /etc/hosts edits on modern browsers/OSes); production
// uses <slug>.omboo.am behind wildcard DNS/TLS (an infra prerequisite, not something this code
// sets up — until it's in place, the app itself is reachable at app.omboo.am, the shared/no-org
// host). omboo.am and www.omboo.am are the separate marketing site, not this app, but they're
// harmless to list here too. Returns null for any of these root hosts — the marketing/shared-
// login case with no single org context yet.
const ROOT_HOSTS = new Set(["app.omboo.am", "omboo.am", "www.omboo.am", "localhost", "127.0.0.1"]);

export function extractOrgSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (ROOT_HOSTS.has(hostname)) return null;

  const parts = hostname.split(".");
  // <slug>.localhost -> ["slug", "localhost"]; <slug>.omboo.am -> ["slug", "omboo", "am"].
  if (parts.length < 2) return null;
  if (parts[parts.length - 1] !== "localhost" && !hostname.endsWith(".omboo.am")) return null;

  const slug = parts[0];
  return slug && !ROOT_HOSTS.has(`${slug}.omboo.am`) ? slug : null;
}
