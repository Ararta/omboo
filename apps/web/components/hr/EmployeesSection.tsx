"use client";

import { useEffect, useMemo, useState } from "react";
import { Stamp } from "lucide-react";
import { chunkSatisfied, PRIORITY_LABELS, todayInYerevan, workYearBounds } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { EmployeeView, RequestView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const PRIORITY_KEYS = [
  ["priorityUnder18", PRIORITY_LABELS.under18],
  ["priorityParentOrPregnant", PRIORITY_LABELS.parentOrPregnant],
  ["priorityTeacher", PRIORITY_LABELS.teacher],
  ["priorityCaregiver", PRIORITY_LABELS.caregiver],
  ["priorityViolenceVictim", PRIORITY_LABELS.violenceVictim],
] as const;

export function EmployeesSection() {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [allRequests, setAllRequests] = useState<RequestView[]>([]);
  const [balanceDraft, setBalanceDraft] = useState<Record<string, string>>({});
  const [newEmp, setNewEmp] = useState({ name: "", position: "", email: "", hireDate: todayInYerevan(), balance: 20 });
  const [loading, setLoading] = useState(true);
  const [addError, setAddError] = useState("");
  const [emailConflict, setEmailConflict] = useState(false);

  async function load() {
    const [emps, reqs] = await Promise.all([api.get<EmployeeView[]>("/employees"), api.get<RequestView[]>("/requests")]);
    setEmployees(emps);
    setAllRequests(reqs);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateField(id: string, field: string, value: string | number | boolean) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    await api.patch(`/employees/${id}`, { [field]: value });
  }

  async function saveBalance(id: string) {
    const raw = balanceDraft[id];
    if (raw === undefined || raw === "") return;
    await api.patch(`/employees/${id}/balance`, { balance: Math.max(0, Number(raw)) });
    setBalanceDraft((prev) => ({ ...prev, [id]: "" }));
    load();
  }

  async function addEmployee(opts?: { skipEmail?: boolean }) {
    if (!newEmp.name.trim()) return;
    setAddError("");
    try {
      await api.post("/employees", {
        name: newEmp.name.trim(),
        position: newEmp.position.trim() || "—",
        email: opts?.skipEmail ? undefined : newEmp.email.trim() || undefined,
        hireDate: newEmp.hireDate,
        minimumDays: Math.max(0, Number(newEmp.balance) || 0),
        extendedDays: 0,
        additionalDays: 0,
      });
      setNewEmp({ name: "", position: "", email: "", hireDate: todayInYerevan(), balance: 20 });
      setEmailConflict(false);
      load();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Չհաջողվեց ավելացնել աշխատողին, փորձեք կրկին։");
      setEmailConflict(e instanceof ApiError && e.status === 409);
    }
  }

  const autoChunkByEmployee = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const e of employees) {
      const wy = workYearBounds(e.hireDate, todayInYerevan());
      map[e.id] = chunkSatisfied(
        allRequests.map((r) => ({ employeeId: r.employeeId, type: r.type, start: r.start, end: r.end, days: r.days, status: r.status })),
        e.id,
        wy,
      );
    }
    return map;
  }, [employees, allRequests]);

  if (loading) return <Card className="mb-5 text-sm text-muted">Բեռնվում է…</Card>;

  return (
    <Card className="mb-5">
      <div className="mb-1 flex items-center gap-1.5">
        <Stamp size={15} className="text-seal" />
        <div className="font-serif text-[17px] text-ink">Աշխատողների կառավարում (ադմին)</div>
      </div>
      <div className="mb-3.5 text-[12.5px] text-muted">
        Յուրաքանչյուր աշխատողի համար լրացրեք պայմանագրի արձակուրդային տվյալները։
      </div>
      <div className="mb-4 flex flex-col gap-2.5">
        {employees.map((e) => (
          <div key={e.id} className="rounded-lg border border-line p-3">
            <div className="mb-2 flex flex-wrap justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">{e.name}</div>
                <div className="text-xs text-muted">{e.position}</div>
              </div>
              <div className="text-xs text-muted">
                Ընդամենը՝ <b className="text-seal">{e.annualTotal} oր</b> · Մնացորդ՝ <b className="text-ink">{e.balance} oր</b>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Աշխ. սկիզբ</label>
                <input
                  type="date"
                  defaultValue={e.hireDate.slice(0, 10)}
                  onBlur={(ev) => updateField(e.id, "hireDate", ev.target.value)}
                  className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Էլ. փոստ</label>
                <input
                  type="email"
                  defaultValue={e.email}
                  onBlur={(ev) => updateField(e.id, "email", ev.target.value)}
                  className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mb-1.5 text-xs font-bold text-ink">Արձակուրդի տեսակներ</div>
            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Նվազագույն (հոդ. 159)</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={e.minimumDays}
                  onBlur={(ev) => updateField(e.id, "minimumDays", Number(ev.target.value))}
                  className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Երկարացված (հոդ. 160)</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={e.extendedDays}
                  onBlur={(ev) => updateField(e.id, "extendedDays", Number(ev.target.value))}
                  className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Լրացուցիչ (հոդ. 161)</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={e.additionalDays}
                  onBlur={(ev) => updateField(e.id, "additionalDays", Number(ev.target.value))}
                  className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">Ընդամենը</label>
                <div className="flex h-[34px] items-center rounded-md bg-paper px-2.5 text-sm font-bold text-seal">{e.annualTotal} oր</div>
              </div>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              {PRIORITY_KEYS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-[11.5px] text-[#4A4E5A]">
                  <input
                    type="checkbox"
                    checked={!!e[key]}
                    onChange={(ev) => updateField(e.id, key, ev.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2.5 rounded-md bg-paper px-2.5 py-1.5">
              <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={e.tenDayChunkConfirmed}
                  onChange={(ev) => updateField(e.id, "tenDayChunkConfirmed", ev.target.checked)}
                />
                10-oրյա հատվածն արդեն կիրառված է (հոդված 163)
              </label>
              <span className={`text-[10.5px] ${autoChunkByEmployee[e.id] ? "text-[#1E6B3A]" : "text-muted"}`}>
                {autoChunkByEmployee[e.id] ? "✓ Հայտնաբերված է հայտ-դիմումների պատմությունից" : "Համակարգում դեռ չկա ≥10-oրյա հայտ-դիմում այս աշխ. տարվա համար"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="ուղղել մնացորդը"
                value={balanceDraft[e.id] ?? ""}
                onChange={(ev) => setBalanceDraft({ ...balanceDraft, [e.id]: ev.target.value })}
                className="w-[130px] rounded-md border border-line px-2.5 py-1.5 text-sm"
              />
              <Button variant="ghost" onClick={() => saveBalance(e.id)} disabled={!balanceDraft[e.id]}>
                Պահպանել մնացորդը
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11.5px] text-muted">Ազատ oրերի մնացորդ (ներքին)</label>
              <input
                type="number"
                min={0}
                defaultValue={e.dayOffBalance}
                onBlur={(ev) => updateField(e.id, "dayOffBalance", Number(ev.target.value))}
                className="w-[90px] rounded-md border border-line px-2.5 py-1.5 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line pt-3.5">
        <div className="mb-2 text-sm font-bold text-ink">Ավելացնել նոր աշխատող</div>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Անուն Ազգանուն"
            value={newEmp.name}
            onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
            className="min-w-[160px] flex-[2] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            placeholder="Պաշտոն"
            value={newEmp.position}
            onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
            className="min-w-[140px] flex-[2] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            type="email"
            placeholder="Էլ. փոստ"
            value={newEmp.email}
            onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
            className="min-w-[160px] flex-[2] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            type="date"
            value={newEmp.hireDate}
            onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })}
            className="w-[140px] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="Մնացորդ (oր)"
            value={newEmp.balance}
            onChange={(e) => setNewEmp({ ...newEmp, balance: Number(e.target.value) })}
            className="w-[110px] rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <Button onClick={() => addEmployee()} disabled={!newEmp.name.trim()}>
            Ավելացնել
          </Button>
        </div>
        {!!addError && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-red-700">
            <span>{addError}</span>
            {emailConflict && (
              <button
                onClick={() => addEmployee({ skipEmail: true })}
                className="font-semibold text-seal underline hover:no-underline"
              >
                Ավելացնե՞մ առանց email-ի
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
