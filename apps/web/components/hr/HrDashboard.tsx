"use client";

import { useState } from "react";
import { Users, Clock, FileSignature, RotateCcw, ScrollText, Settings2 } from "lucide-react";
import { OrgSettingsSection } from "./OrgSettingsSection";
import { EmployeesSection } from "./EmployeesSection";
import { ReminderSection } from "./ReminderSection";
import { OrdersSection } from "./OrdersSection";
import { RecallsSection } from "./RecallsSection";
import { AuditSection } from "./AuditSection";
import { Modal } from "../ui/Modal";

const NAV_SECTIONS = [
  { id: "employees", label: "Աշխատողների կառավարում", icon: Users, Component: EmployeesSection },
  { id: "reminders", label: "2,5-ամյա ժամկետ", icon: Clock, Component: ReminderSection },
  { id: "orders", label: "Հրամանի կազմում", icon: FileSignature, Component: OrdersSection },
  { id: "recalls", label: "Հետկանչում", icon: RotateCcw, Component: RecallsSection },
  { id: "audit", label: "Աուդիտի մատյան", icon: ScrollText, Component: AuditSection },
] as const;

export function HrDashboard() {
  const [orgConfigured, setOrgConfigured] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_SECTIONS[0].id);

  const ActiveComponent = NAV_SECTIONS.find((s) => s.id === activeId)?.Component ?? NAV_SECTIONS[0].Component;

  return (
    <div className="flex items-start gap-6">
      <nav className="sticky top-7 hidden w-64 shrink-0 rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(27,42,74,0.04),0_10px_28px_-18px_rgba(27,42,74,0.18)] lg:block">
        <div className="mb-2.5 px-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-seal">Բաժիններ</div>

        <button
          onClick={() => setOrgModalOpen(true)}
          className="mb-2.5 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-seal/40 bg-seal/5 px-3 py-2.5 text-left text-[13.5px] font-semibold text-seal transition hover:bg-seal/10"
        >
          <Settings2 size={16} strokeWidth={2.5} />
          <span className="flex-1">Կազմակերպության տվյալներ</span>
          {!orgConfigured && <span className="rounded-full bg-seal px-1.5 py-0.5 text-[9.5px] font-bold text-white">լրացնել</span>}
        </button>

        <div className="mb-1.5 h-px bg-line" />

        <div className="flex flex-col gap-0.5">
          {NAV_SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition ${
                  active ? "bg-ink font-bold text-white" : "font-medium text-ink hover:bg-paper"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} className={active ? "text-white" : "text-muted"} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <OrgSettingsSection onConfiguredChange={setOrgConfigured} />
        <ActiveComponent />
      </div>

      {orgModalOpen && (
        <Modal onClose={() => setOrgModalOpen(false)}>
          <OrgSettingsSection mode="always" onConfiguredChange={setOrgConfigured} onClose={() => setOrgModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
