"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, Pencil } from "lucide-react";
import { todayInYerevan } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { AttendanceLogView, AttendanceReportRowView, OrgSettingsView } from "../../lib/types";
import { Card } from "../ui/Card";

function firstOfMonth(): string {
  const d = todayInYerevan();
  return `${d.slice(0, 7)}-01`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function GeofenceSettings() {
  const [org, setOrg] = useState<OrgSettingsView | null>(null);
  const [radius, setRadius] = useState(150);
  const [capturing, setCapturing] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<OrgSettingsView>("/org-settings").then((data) => {
      setOrg(data);
      setRadius(data.geofenceRadiusMeters);
    });
  }, []);

  function captureCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Այս browser-ը տեղորոշում չի աջակցում։");
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCapturing(false);
      },
      () => {
        setError("Չհաջողվեց ստանալ դիրքը, ստուգեք browser-ի թույլտվությունը։");
        setCapturing(false);
      },
    );
  }

  async function save() {
    setStatus("idle");
    setError("");
    try {
      const point = pendingPoint ?? (org?.officeLat != null && org?.officeLng != null ? { lat: org.officeLat, lng: org.officeLng } : null);
      if (!point) {
        setError("Նախ սահմանեք աշխատավայրի դիրքը։");
        return;
      }
      const updated = await api.patch<OrgSettingsView>("/org-settings/geofence", {
        officeLat: point.lat,
        officeLng: point.lng,
        geofenceRadiusMeters: radius,
      });
      setOrg(updated);
      setPendingPoint(null);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Չհաջողվեց պահպանել։");
      setStatus("error");
    }
  }

  if (!org) return null;

  const effectivePoint = pendingPoint ?? (org.officeLat != null && org.officeLng != null ? { lat: org.officeLat, lng: org.officeLng } : null);

  return (
    <Card className="mb-3.5">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
        <MapPin size={13} />
        Աշխատավայրի դիրքորոշում (geofence)
      </div>
      <p className="mb-3 text-[12.5px] text-muted">
        Աշխատակիցները կկարողանան նշել մուտք/ելք միայն այս կետից նշված շառավղի սահմաններում։ Կանգնեք աշխատավայրում և սեղմեք ներքևի կոճակը։
      </p>
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <button
          onClick={captureCurrentLocation}
          disabled={capturing}
          className="rounded-md border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:bg-paper disabled:opacity-50"
        >
          {capturing ? "…" : "Օգտագործել իմ ընթացիկ դիրքը"}
        </button>
        <span className="text-[12.5px] text-muted">
          {effectivePoint ? `${effectivePoint.lat.toFixed(5)}, ${effectivePoint.lng.toFixed(5)}` : "Դիրքը դեռ սահմանված չէ"}
        </span>
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <label className="text-[12.5px] text-muted">Շառավիղ (մետր)</label>
        <input
          type="number"
          min={10}
          max={5000}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-[100px] rounded-md border border-line px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="flex items-center gap-2.5">
        <button onClick={save} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
          Պահպանել
        </button>
        {status === "saved" && <span className="text-[12.5px] text-green-700">Պահպանված է ✓</span>}
        {!!error && <span className="text-[12.5px] text-red-700">{error}</span>}
      </div>
    </Card>
  );
}

export function AttendanceSection() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayInYerevan());
  const [report, setReport] = useState<AttendanceReportRowView[]>([]);
  const [logs, setLogs] = useState<AttendanceLogView[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ checkInAt: string; checkOutAt: string; note: string }>({
    checkInAt: "",
    checkOutAt: "",
    note: "",
  });

  const query = useMemo(() => `?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`, [from, to]);

  async function load() {
    const [reportRes, logsRes] = await Promise.all([
      api.get<AttendanceReportRowView[]>(`/attendance/report${query}`),
      api.get<AttendanceLogView[]>(`/attendance${query}`),
    ]);
    setReport(reportRes);
    setLogs(logsRes);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function startEdit(log: AttendanceLogView) {
    setEditingId(log.id);
    setEditDraft({
      checkInAt: toDatetimeLocal(log.checkInAt),
      checkOutAt: toDatetimeLocal(log.checkOutAt),
      note: log.note ?? "",
    });
  }

  async function saveEdit(id: string) {
    await api.patch(`/attendance/${id}`, {
      checkInAt: editDraft.checkInAt ? new Date(editDraft.checkInAt).toISOString() : undefined,
      checkOutAt: editDraft.checkOutAt ? new Date(editDraft.checkOutAt).toISOString() : null,
      note: editDraft.note || undefined,
    });
    setEditingId(null);
    load();
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Ներկայության տեղեկագիր</div>

      <GeofenceSettings />

      <Card className="mb-3.5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <label className="text-[12.5px] text-muted">Սկիզբ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-line px-2.5 py-1.5 text-sm" />
          <label className="text-[12.5px] text-muted">Ավարտ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-line px-2.5 py-1.5 text-sm" />
        </div>

        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Clock3 size={13} />
          Ամփոփ ժամեր
        </div>
        {report.length === 0 && <div className="text-[12.5px] text-muted">Տվյալ ընկած ժամանակահատվածում գրանցումներ չկան։</div>}
        {report.map((r) => (
          <div key={r.employeeId} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 first:border-t-0">
            <div>
              <span className="text-[13px] font-semibold text-ink">{r.name}</span>
              <span className="text-[12px] text-muted"> · {r.position}</span>
            </div>
            <div className="text-[13px] text-ink">
              <b className="text-seal">{r.totalHours}</b> ժամ · {r.entryCount} գրանցում
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-seal">Մուտք/ելքի գրանցումներ</div>
        {logs.length === 0 && <div className="text-[12.5px] text-muted">Դատարկ է։</div>}
        {logs.map((log, i) => (
          <div key={log.id} className={`py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
            {editingId === log.id ? (
              <div className="flex flex-col gap-2">
                <div className="text-[13px] font-semibold text-ink">{log.employee.name}</div>
                <div className="flex flex-wrap gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted">Մուտք</label>
                    <input
                      type="datetime-local"
                      value={editDraft.checkInAt}
                      onChange={(e) => setEditDraft({ ...editDraft, checkInAt: e.target.value })}
                      className="rounded-md border border-line px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted">Ելք</label>
                    <input
                      type="datetime-local"
                      value={editDraft.checkOutAt}
                      onChange={(e) => setEditDraft({ ...editDraft, checkOutAt: e.target.value })}
                      className="rounded-md border border-line px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <input
                  placeholder="Նշում (ինչու է խմբագրված)"
                  value={editDraft.note}
                  onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                  className="rounded-md border border-line px-2.5 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(log.id)} className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white">
                    Պահպանել
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-semibold text-ink">
                    Չեղարկել
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px]">
                  <span className="font-semibold text-ink">{log.employee.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {fmtDateTime(log.checkInAt)} – {fmtDateTime(log.checkOutAt)}
                  </span>
                  {log.checkInWithinGeofence === false && <span className="text-[11.5px] text-red-700"> · սահմաններից դուրս</span>}
                  {log.editedByUserId && <span className="text-[11.5px] text-seal"> · խմբագրված</span>}
                  {log.note && <span className="text-[12px] italic text-muted"> · «{log.note}»</span>}
                </div>
                <button onClick={() => startEdit(log)} className="flex items-center gap-1 text-[12.5px] font-semibold text-seal">
                  <Pencil size={13} />
                  Խմբագրել
                </button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
