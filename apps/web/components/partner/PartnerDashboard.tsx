"use client";

import { useState } from "react";
import { LayoutDashboard, Briefcase, PlusCircle, Receipt, Image as ImageIcon, LifeBuoy } from "lucide-react";
import { PartnerAppHeader } from "./PartnerAppHeader";
import { OverviewSection } from "./OverviewSection";
import { DealsSection } from "./DealsSection";
import { NewDealSection } from "./NewDealSection";
import { CommissionStatementsSection } from "./CommissionStatementsSection";
import { MarketingMaterialsSection } from "./MarketingMaterialsSection";
import { SupportSection } from "./SupportSection";

const NAV_SECTIONS = [
  { id: "overview", label: "Ընդհանուր տեսություն", icon: LayoutDashboard, render: () => <OverviewSection /> },
  { id: "deals", label: "Իմ գործարքները", icon: Briefcase, render: () => <DealsSection /> },
  { id: "new-deal", label: "Նոր գործարք", icon: PlusCircle, render: () => <NewDealSection /> },
  { id: "commission", label: "Կոմիսիայի հաշվետվություն", icon: Receipt, render: () => <CommissionStatementsSection /> },
  { id: "marketing", label: "Մարքեթինգային նյութեր", icon: ImageIcon, render: () => <MarketingMaterialsSection /> },
  { id: "support", label: "Աջակցություն", icon: LifeBuoy, render: () => <SupportSection /> },
];

// Supplies the dashboard chrome (padding/max-width/header) itself, since app/partner/layout.tsx
// is a deliberate passthrough (see its header comment) — /partner/login and /partner/register
// are nested in the same route subtree and must not inherit this chrome.
export function PartnerDashboard() {
  const [activeId, setActiveId] = useState("overview");
  const active = NAV_SECTIONS.find((s) => s.id === activeId) ?? NAV_SECTIONS[0];

  return (
    <div className="min-h-screen bg-paper px-5 py-7">
      <div className="mx-auto max-w-[1180px]">
        <PartnerAppHeader title="Գործընկերոջ վահանակ" />

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
      </div>
    </div>
  );
}
