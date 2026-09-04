"use client";

import { useState } from "react";
import { ClipboardCheck, PackageSearch, Percent, Image as ImageIcon, Building2 } from "lucide-react";
import { PendingApprovalsSection } from "./PendingApprovalsSection";
import { PackagesPricingSection } from "./PackagesPricingSection";
import { CommissionRatesSection } from "./CommissionRatesSection";
import { MarketingAssetsAdminSection } from "./MarketingAssetsAdminSection";
import { PartnersOverviewSection } from "./PartnersOverviewSection";

// The four Platform Admin sections below only ever render for the ararta org's own director
// login (isPlatformOwner, see auth/jwt.strategy.ts) — every other director just sees the
// original single "pending approvals" section, unchanged from before this dashboard existed.
export function DirectorDashboard({ isPlatformOwner }: { isPlatformOwner: boolean }) {
  const NAV_SECTIONS = [
    { id: "approvals", label: "Հաստատման սպասող հայտեր", icon: ClipboardCheck, render: () => <PendingApprovalsSection /> },
    ...(isPlatformOwner
      ? [
          { id: "packages", label: "Փաթեթներ և գներ", icon: PackageSearch, render: () => <PackagesPricingSection /> },
          { id: "commission-rates", label: "Կոմիսիայի տոկոսադրույքներ", icon: Percent, render: () => <CommissionRatesSection /> },
          { id: "marketing-assets", label: "Մարքեթինգային նյութեր", icon: ImageIcon, render: () => <MarketingAssetsAdminSection /> },
          { id: "partners", label: "Գործընկերներ", icon: Building2, render: () => <PartnersOverviewSection /> },
        ]
      : []),
  ];

  const [activeId, setActiveId] = useState("approvals");
  const active = NAV_SECTIONS.find((s) => s.id === activeId) ?? NAV_SECTIONS[0];

  if (NAV_SECTIONS.length === 1) return <PendingApprovalsSection />;

  return (
    <div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-6">
      <nav className="scrollbar-none -mx-5 flex w-[calc(100%+2.5rem)] gap-1.5 overflow-x-auto px-5 pb-1 lg:hidden">
        {NAV_SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold transition ${
                isActive ? "bg-ink text-white" : "border border-line bg-white text-ink"
              }`}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-white" : "text-muted"} />
              {s.label}
            </button>
          );
        })}
      </nav>

      <nav className="sticky top-7 hidden w-64 shrink-0 rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(27,42,74,0.04),0_10px_28px_-18px_rgba(27,42,74,0.18)] lg:block">
        <div className="mb-2.5 px-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-seal">Բաժիններ</div>
        <div className="flex flex-col gap-0.5">
          {NAV_SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition ${
                  isActive ? "bg-ink font-bold text-white" : "font-medium text-ink hover:bg-paper"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-white" : "text-muted"} />
                <span className="flex-1">{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 w-full flex-1">{active.render()}</div>
    </div>
  );
}
