"use client";

import { useRouter } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

export function AppHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-seal">{eyebrow}</div>
        <div className="font-serif text-[30px] font-extrabold tracking-tight text-ink">{title}</div>
      </div>
      <div className="flex items-center gap-2.5">
        <NotificationBell />
        <button onClick={logout} className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
          Ելք
        </button>
      </div>
    </div>
  );
}
