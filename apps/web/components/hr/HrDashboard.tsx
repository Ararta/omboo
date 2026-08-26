"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Clock, FileSignature, RotateCcw, ScrollText, MapPin, FolderOpen, Network } from "lucide-react";
import { api } from "../../lib/api-client";
import type { OrgSettingsView } from "../../lib/types";
import { OrgSettingsSection } from "./OrgSettingsSection";
import { EmployeesSection } from "./EmployeesSection";
import { ReminderSection } from "./ReminderSection";
import { OrdersSection } from "./OrdersSection";
import { RecallsSection } from "./RecallsSection";
import { AuditSection } from "./AuditSection";
import { AttendanceSection } from "./AttendanceSection";
import { DocumentsSection } from "./DocumentsSection";
import { OrgChartSection } from "./OrgChartSection";

export function HrDashboard() {
  // Starts unknown so the "fill in" badge doesn't flash on an already-configured org just
  // because the org tab (the only place that normally checks) hasn't been opened yet.
  const [orgConfigured, setOrgConfigured] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState("employees");

  useEffect(() => {
    api.get<OrgSettingsView>("/org-settings").then((data) => setOrgConfigured(data.companyName.trim().length > 0));
  }, []);

  const NAV_SECTIONS = [
    { id: "org", label: "Կազմակերպության տվյալներ", icon: Building2, render: () => <OrgSettingsSection onConfiguredChange={setOrgConfigured} /> },
    { id: "employees", label: "Աշխատողների կառավարում", icon: Users, render: () => <EmployeesSection /> },
    { id: "orgchart", label: "Կազմակերպական կառուցվածք", icon: Network, render: () => <OrgChartSection /> },
    { id: "documents", label: "Փաստաթղթերի գրադարան", icon: FolderOpen, render: () => <DocumentsSection /> },
    { id: "attendance", label: "Ներկայության տեղեկագիր", icon: MapPin, render: () => <AttendanceSection /> },
    { id: "reminders", label: "2,5-ամյա ժամկետ", icon: Clock, render: () => <ReminderSection /> },
    { id: "orders", label: "Հրամանի կազմում", icon: FileSignature, render: () => <OrdersSection /> },
    { id: "recalls", label: "Հետկանչում", icon: RotateCcw, render: () => <RecallsSection /> },
    { id: "audit", label: "Աուդիտի մատյան", icon: ScrollText, render: () => <AuditSection /> },
  ];

  const active = NAV_SECTIONS.find((s) => s.id === activeId) ?? NAV_SECTIONS[1];

  return (
    <div className="flex items-start gap-6">
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
                {s.id === "org" && orgConfigured === false && (
                  <span className="rounded-full bg-seal px-1.5 py-0.5 text-[9.5px] font-bold text-white">լրացնել</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">{active.render()}</div>
    </div>
  );
}
