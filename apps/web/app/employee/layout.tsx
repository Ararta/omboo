"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "../../components/AppHeader";

const TABS = [
  { href: "/employee/requests", label: "Դիմումներ" },
  { href: "/employee/salary", label: "Աշխատավարձ" },
  { href: "/employee/events", label: "Կորպորատիվ միջոցառումներ" },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper px-5 py-7">
      <div className="mx-auto max-w-[900px]">
        <AppHeader eyebrow="ՄՌԿ Թվային Հարթակ · Փուլ 1" title="Արձակուրդի/բացակայության հայտ-դիմում" />

        <div className="mb-5 flex gap-1 border-b border-line">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-semibold ${
                  active ? "border-seal text-ink" : "border-transparent text-muted"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
