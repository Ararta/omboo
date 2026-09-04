"use client";

import { useRouter } from "next/navigation";

// Partner-portal counterpart to components/AppHeader.tsx — kept as its own small component
// rather than generalizing the shared one, since AppHeader is hardcoded to the org logout
// endpoint/redirect and embeds NotificationBell (an org-only feature not built for partners in
// this phase); duplicating ~15 lines is simpler and lower-risk than threading optional props
// through a component three other dashboards already depend on.
export function PartnerAppHeader({ title }: { title: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/partner-auth/logout", { method: "POST" });
    router.push("/partner/login");
    router.refresh();
  }

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-seal">Omboo · Գործընկերների հարթակ</div>
        <div className="font-serif text-[22px] font-extrabold tracking-tight text-ink sm:text-[30px]">{title}</div>
      </div>
      <button onClick={logout} className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
        Ելք
      </button>
    </div>
  );
}
