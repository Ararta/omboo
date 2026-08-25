"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { fmtDateHY, REQUEST_TYPE_LABELS, type RequestStatus, type RequestType } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { RequestView } from "../../lib/types";
import { Card } from "../ui/Card";
import { StatusPill, STATUS_LABELS } from "../ui/StatusPill";

const MONTH_NAMES_NOMINATIVE = [
  "Հունվար",
  "Փետրվար",
  "Մարտ",
  "Ապրիլ",
  "Մայիս",
  "Հունիս",
  "Հուլիս",
  "Օգոստոս",
  "Սեպտեմբեր",
  "Հոկտեմբեր",
  "Նոյեմբեր",
  "Դեկտեմբեր",
];

const ALL = "ALL";

export function AuditSection() {
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState<typeof ALL | RequestType>(ALL);
  const [statusFilter, setStatusFilter] = useState<typeof ALL | RequestStatus>(ALL);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get<RequestView[]>("/requests").then(setRequests);
  }, []);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) if (r.employee) map.set(r.employeeId, r.employee.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "hy"));
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("hy");
    return requests.filter((r) => {
      if (employeeFilter !== ALL && r.employeeId !== employeeFilter) return false;
      if (typeFilter !== ALL && r.type !== typeFilter) return false;
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (q) {
        const haystack = `${r.employee?.name ?? ""} ${r.orderNumber ?? ""}`.toLocaleLowerCase("hy");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, employeeFilter, typeFilter, statusFilter, query]);

  const groupedByYear = useMemo(() => {
    const byYear = new Map<number, Map<number, RequestView[]>>();
    for (const r of filtered) {
      const d = new Date(r.start);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      if (!byYear.has(y)) byYear.set(y, new Map());
      const byMonth = byYear.get(y)!;
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(r);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);
    return years.map((year) => {
      const byMonth = byYear.get(year)!;
      const months = [...byMonth.keys()]
        .sort((a, b) => b - a)
        .map((month) => ({
          month,
          items: byMonth.get(month)!.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
        }));
      return { year, months };
    });
  }, [filtered]);

  const hasActiveFilters = employeeFilter !== ALL || typeFilter !== ALL || statusFilter !== ALL || query.trim() !== "";

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Աուդիտի մատյան — բոլոր հայտ-դիմումները</div>

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Filter size={13} />
          Ֆիլտր
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value={ALL}>Բոլոր աշխատողները</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof ALL | RequestType)}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value={ALL}>Բոլոր տեսակները</option>
            {Object.entries(REQUEST_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof ALL | RequestStatus)}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value={ALL}>Բոլոր կարգավիճակները</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Փնտրել՝ անուն կամ հրամանի համար"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
        </div>
        {hasActiveFilters && (
          <div className="mt-2.5 flex items-center gap-2.5 text-[12px] text-muted">
            <span>
              {filtered.length} / {requests.length} հայտ-դիմում
            </span>
            <button
              onClick={() => {
                setEmployeeFilter(ALL);
                setTypeFilter(ALL);
                setStatusFilter(ALL);
                setQuery("");
              }}
              className="font-semibold text-seal underline hover:no-underline"
            >
              Մաքրել ֆիլտրերը
            </button>
          </div>
        )}
      </Card>

      {groupedByYear.length === 0 && (
        <Card>
          <div className="text-sm text-muted">Ոչինչ չի գտնվել այս ֆիլտրերով։</div>
        </Card>
      )}

      {groupedByYear.map(({ year, months }) => (
        <div key={year} className="mb-3.5">
          <div className="mb-2 font-serif text-[15px] font-bold text-ink">{year}</div>
          {months.map(({ month, items }) => (
            <Card key={month} className="mb-2.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{MONTH_NAMES_NOMINATIVE[month]}</div>
              {items.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <div className="text-[13px]">
                    <span className="font-semibold text-ink">{r.employee?.name}</span>
                    <span className="text-muted">
                      {" "}
                      · {REQUEST_TYPE_LABELS[r.type]} · {fmtDateHY(r.start)}–{fmtDateHY(r.end)}
                    </span>
                    {r.orderNumber && <span className="font-mono text-seal"> · {r.orderNumber}</span>}
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </Card>
          ))}
        </div>
      ))}
    </>
  );
}
