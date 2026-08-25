"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronRight, Clock, RotateCcw, Trash2, X } from "lucide-react";
import {
  addDaysISO,
  businessDays,
  fmtDateHY,
  MIN_CHUNK_DAYS,
  PRIORITY_LABELS,
  REQUEST_TYPE_LABELS,
  todayInYerevan,
  validateSubmitRequest,
  type CreateRequestInput,
  type RequestType,
} from "@omboo/shared";
import { api, ApiError } from "../../../lib/api-client";
import type { EmployeeView, RequestView } from "../../../lib/types";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Seal } from "../../../components/ui/Seal";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Timeline } from "../../../components/ui/Timeline";
import { TeamOutCard } from "../../../components/TeamOutCard";

export default function RequestsPage() {
  const [me, setMe] = useState<EmployeeView | null>(null);
  const [myRequests, setMyRequests] = useState<RequestView[]>([]);
  const [teamOut, setTeamOut] = useState<RequestView[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<{ type: RequestType; start: string; end: string; reason: string }>({
    type: "VACATION",
    start: "",
    end: "",
    reason: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    const [meRes, reqRes, teamRes] = await Promise.all([
      api.get<EmployeeView>("/employees/me"),
      api.get<RequestView[]>("/requests/mine"),
      api.get<RequestView[]>("/requests/team-out"),
    ]);
    setMe(meRes);
    setMyRequests(reqRes);
    setTeamOut(teamRes);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => businessDays(form.start, form.end), [form.start, form.end]);
  const relevantBalance = me ? (form.type === "VACATION" ? me.balance : form.type === "DAYOFF" ? me.dayOffBalance : null) : null;

  const clientCheck = useMemo(() => {
    if (!me || !form.start || !form.end) return null;
    return validateSubmitRequest(
      { type: form.type, start: form.start, end: form.end },
      { id: me.id, hireDate: me.hireDate, balance: me.balance, dayOffBalance: me.dayOffBalance, tenDayChunkConfirmed: me.tenDayChunkConfirmed },
      myRequests.map((r) => ({ employeeId: me.id, type: r.type, start: r.start, end: r.end, days: r.days, status: r.status })),
      todayInYerevan(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, myRequests, form.type, form.start, form.end]);

  async function submit() {
    setFormError("");
    if (clientCheck && !clientCheck.ok) {
      setFormError(clientCheck.message);
      return;
    }
    setSubmitting(true);
    try {
      const dto: CreateRequestInput = { type: form.type, start: form.start, end: form.end, reason: form.reason || undefined };
      await api.post("/requests", dto);
      setForm({ type: "VACATION", start: "", end: "", reason: "" });
      await loadAll();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ, փորձեք կրկին։");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    await api.post(`/requests/${id}/cancel`);
    loadAll();
  }

  async function respondRecall(requestId: string, accept: boolean) {
    await api.patch(`/recalls/${requestId}/respond`, { accept });
    loadAll();
  }

  if (loading || !me) return <div className="text-sm text-muted">Բեռնվում է…</div>;

  const activePriorityFlags = [
    me.priorityUnder18 && PRIORITY_LABELS.under18,
    me.priorityParentOrPregnant && PRIORITY_LABELS.parentOrPregnant,
    me.priorityTeacher && PRIORITY_LABELS.teacher,
    me.priorityCaregiver && PRIORITY_LABELS.caregiver,
    me.priorityViolenceVictim && PRIORITY_LABELS.violenceVictim,
  ].filter(Boolean) as string[];

  const pendingRecalls = myRequests.filter((r) => r.recall && r.recall.status === "PENDING_EMPLOYEE");
  const minStart = form.type === "VACATION" ? addDaysISO(todayInYerevan(), 5) : todayInYerevan();

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <div className="mb-2 text-xs text-muted">Իմ արձակուրդային oրերի մնացորդ</div>
            <Seal label={me.balance} sub="oր մնացորդ" />
          </div>
          <div className="min-w-[170px] text-[13px] text-[#4A4E5A]">
            <div>
              Օգտագործված՝ <b className="text-ink">{me.annualTotal - me.balance}</b> oր
            </div>
            <div>
              Տարեկան ընդամենը՝ <b className="text-ink">{me.annualTotal}</b> oր
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              {[
                me.minimumDays > 0 && `նվազագույն՝ ${me.minimumDays}`,
                me.extendedDays > 0 && `երկարացված՝ ${me.extendedDays}`,
                me.additionalDays > 0 && `լրացուցիչ՝ ${me.additionalDays}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <div className="mb-2 text-xs text-muted">Իմ ազատ oրերի մնացորդ</div>
            <Seal label={me.dayOffBalance} sub="ազատ oր" tone="ink" />
          </div>
          <div className="max-w-[340px] text-[12.5px] text-muted">
            Ներքին կանոնակարգով հաստատված ազատ oրերի (դեյoֆֆ) մնացորդն է. առանձին է oրենքով սահմանված արձակուրդից։
          </div>
        </div>
      </Card>

      {pendingRecalls.map((r) => (
        <Card key={"recall-" + r.id} className="mb-4" style={{ borderColor: "#E8C9C9", background: "#FBF5F5" }}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <RotateCcw size={15} color="#A02E2E" />
            <div className="font-serif text-[15px] text-ink">Հայտ-դիմում՝ վաղաժամկետ վերադարձի մասին</div>
          </div>
          <div className="mb-2.5 text-[13px] text-[#4A4E5A]">
            ՄՌԿ-ն խնդրում է Ձեզ վերադառնալ <b>{fmtDateHY(r.recall!.requestedEnd)}</b>-ից (փոխարեն {fmtDateHY(r.end)}-ի)՝ «
            {r.recall!.reason}»։ Համաձայն ե՞ք։
          </div>
          <div className="flex gap-2">
            <Button onClick={() => respondRecall(r.id, true)}>
              <Check size={14} />
              Համաձայն եմ
            </Button>
            <Button variant="danger" onClick={() => respondRecall(r.id, false)}>
              <X size={14} />
              Մերժել
            </Button>
          </div>
        </Card>
      ))}

      <Card className="mb-4">
        <div className="mb-3.5 font-serif text-[17px] text-ink">Նոր հայտ-դիմում</div>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Տեսակ</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm"
            >
              {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div />
          {form.type === "VACATION" && (
            <div className="flex gap-1.5 rounded-md border border-[#E4D9F5] bg-[#F7F4FC] p-2.5 text-xs text-seal sm:col-span-2">
              <Clock size={13} className="mt-0.5 shrink-0" />
              <span>
                Հայտ-դիմումն ուղարկվում է առնվազն 5 oր առաջ (հոդված 169), և մինչև վճարման ժամկետը (սկզբից 3 oր առաջ) պետք է մնա
                առնվազն 2 աշխատանքային oր՝ հրամանի ձևակերպման համար. մասնակի հայտ-դիմումի դեպքում գոնե մեկ հատված պետք է լինի
                առնվազն {MIN_CHUNK_DAYS} աշխ. oր (հոդված 163)։
              </span>
            </div>
          )}
          {form.type === "VACATION" && activePriorityFlags.length > 0 && (
            <div className="rounded-md border border-[#CBE8D0] bg-[#EDF7EF] p-2.5 text-xs text-[#1E6B3A] sm:col-span-2">
              Դուք ունեք արձակուրդի ժամանակի ընտրության առաջնահերթության իրավունք (հոդված 164)՝ {activePriorityFlags.join(", ")}։
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Սկիզբ</label>
            <input
              type="date"
              min={minStart}
              value={form.start}
              onChange={(e) => {
                setFormError("");
                setForm({ ...form, start: e.target.value });
              }}
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Ավարտ</label>
            <input
              type="date"
              min={form.start || undefined}
              value={form.end}
              onChange={(e) => {
                setFormError("");
                setForm({ ...form, end: e.target.value });
              }}
              className="w-full rounded-md border border-line px-2.5 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] text-muted">Մեկնաբանություն (ըստ ցանկության)</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-line px-2.5 py-2 text-sm"
          />
        </div>
        {formError && (
          <div className="mb-2.5 flex items-center gap-1.5 text-[12.5px] text-[#A02E2E]">
            <AlertCircle size={13} />
            {formError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className={`text-[13px] ${relevantBalance !== null && days > relevantBalance ? "text-[#A02E2E]" : "text-muted"}`}>
            {days > 0 ? `${days} աշխատանքային oր` : "Ընտրեք ամսաթվերը"}
            {relevantBalance !== null && days > relevantBalance && " — գերազանցում է մնացորդը"}
          </div>
          <Button onClick={submit} disabled={!form.start || !form.end || days <= 0 || submitting}>
            Ուղարկել հայտ-դիմումը <ChevronRight size={14} />
          </Button>
        </div>
      </Card>

      <TeamOutCard requests={teamOut} />

      <div className="mb-2.5 font-serif text-[17px] text-ink">Իմ հայտ-դիմումները</div>
      {myRequests.length === 0 && <div className="text-sm text-muted">Դեռ հայտ-դիմումներ չկան։</div>}
      {myRequests.map((r) => (
        <Card key={r.id} className="mb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-[14.5px] font-bold text-ink">{REQUEST_TYPE_LABELS[r.type]}</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {fmtDateHY(r.start)} – {fmtDateHY(r.end)} · {r.days} oր
              </div>
              {r.orderNumber && <div className="mt-1 font-mono text-xs text-seal">{r.orderNumber}</div>}
              {r.recall?.status === "FINALIZED" && (
                <div className="mt-0.5 font-mono text-xs text-[#A02E2E]">{r.recall.orderNumber} (հետկանչում)</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusPill status={r.status} />
              {r.status === "SUBMITTED" && (
                <button onClick={() => cancel(r.id)} className="flex items-center gap-1 text-[11.5px] text-muted">
                  <Trash2 size={12} />
                  Հետ կանչել
                </button>
              )}
            </div>
          </div>
          {r.history && <Timeline history={r.history} />}
        </Card>
      ))}
    </div>
  );
}
