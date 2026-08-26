"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getReminderInfo, todayInYerevan, ui } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { EmployeeView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function ReminderSection() {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { start?: string; days?: string }>>({});

  async function load() {
    setEmployees(await api.get<EmployeeView[]>("/employees"));
  }

  useEffect(() => {
    load();
  }, []);

  async function schedule(employeeId: string) {
    const draft = drafts[employeeId];
    if (!draft?.start || !draft.days) return;
    await api.post("/requests/hr-schedule", { employeeId, start: draft.start, days: Number(draft.days) });
    setDrafts((prev) => ({ ...prev, [employeeId]: {} }));
    load();
  }

  const today = todayInYerevan();
  const rows = employees
    .map((e) => ({ e, info: getReminderInfo(e.lastVacationRequestDate, e.hireDate, today) }))
    .filter((x) => x.info.daysRemaining <= 30)
    .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining);

  if (rows.length === 0) return null;

  return (
    <Card className="mb-5" style={{ borderColor: "#E8C9C9" }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <AlertTriangle size={15} color="#841320" />
        <div className="font-serif text-[15px] text-ink">{ui.reminderPanelTitle}</div>
      </div>
      <div className="mb-2.5 text-xs text-muted">{ui.reminderPanelBody}</div>
      {rows.map(({ e, info }) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 border-t border-line py-2">
          <div className="min-w-[140px] flex-1">
            <div className="text-sm font-semibold text-ink">{e.name}</div>
            <div className={`text-[11.5px] ${info.daysRemaining < 0 ? "text-[#841320]" : "text-muted"}`}>
              {info.daysRemaining < 0 ? `Ուշացած է ${Math.abs(info.daysRemaining)} oրով` : `${info.daysRemaining} oր մնաց ժամկետից`}
            </div>
          </div>
          <input
            type="date"
            value={drafts[e.id]?.start || ""}
            onChange={(ev) => setDrafts({ ...drafts, [e.id]: { ...drafts[e.id], start: ev.target.value } })}
            className="w-[132px] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            type="number"
            min={1}
            placeholder="oր"
            value={drafts[e.id]?.days || ""}
            onChange={(ev) => setDrafts({ ...drafts, [e.id]: { ...drafts[e.id], days: ev.target.value } })}
            className="w-16 rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <Button variant="ghost" disabled={!drafts[e.id]?.start || !drafts[e.id]?.days} onClick={() => schedule(e.id)}>
            Նշանակել
          </Button>
        </div>
      ))}
    </Card>
  );
}
