"use client";

import { useState } from "react";
import { OrgSettingsSection } from "./OrgSettingsSection";
import { EmployeesSection } from "./EmployeesSection";
import { ReminderSection } from "./ReminderSection";
import { OrdersSection } from "./OrdersSection";
import { RecallsSection } from "./RecallsSection";
import { AuditSection } from "./AuditSection";
import { Modal } from "../ui/Modal";

const NAV_SECTIONS = [
  { id: "employees", label: "Աշխատողների կառավարում" },
  { id: "reminders", label: "2,5-ամյա ժամկետ" },
  { id: "orders", label: "Հրամանի կազմում" },
  { id: "recalls", label: "Հետկանչում" },
  { id: "audit", label: "Աուդիտի մատյան" },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HrDashboard() {
  const [orgConfigured, setOrgConfigured] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <OrgSettingsSection onConfiguredChange={setOrgConfigured} />
        <div id="employees">
          <EmployeesSection />
        </div>
        <div id="reminders">
          <ReminderSection />
        </div>
        <div id="orders">
          <OrdersSection />
        </div>
        <div id="recalls">
          <RecallsSection />
        </div>
        <div id="audit">
          <AuditSection />
        </div>
      </div>

      <nav className="sticky top-7 hidden w-52 shrink-0 rounded-[10px] border border-line bg-white p-3 lg:block">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-widest text-muted">Բաժիններ</div>
        <button
          onClick={() => setOrgModalOpen(true)}
          className="mb-1 block w-full rounded-md px-2 py-1.5 text-left text-[13px] text-ink hover:bg-paper"
        >
          {orgConfigured ? "Կազմակերպության տվյալներ" : "Կազմակերպության տվյալներ (լրացնել)"}
        </button>
        {NAV_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] text-ink hover:bg-paper"
          >
            {s.label}
          </button>
        ))}
      </nav>

      {orgModalOpen && (
        <Modal onClose={() => setOrgModalOpen(false)}>
          <OrgSettingsSection mode="always" onConfiguredChange={setOrgConfigured} onClose={() => setOrgModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
