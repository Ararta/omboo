"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { fmtDateHY, REQUEST_TYPE_LABELS } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { GeneratedDocumentView, RequestView } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TeamOutCard } from "../../components/TeamOutCard";
import { AccessRequestsCard } from "../../components/AccessRequestsCard";
import { PendingSignatureList } from "../../components/PendingSignatureList";

export default function DirectorPage() {
  const [pending, setPending] = useState<RequestView[]>([]);
  const [teamOut, setTeamOut] = useState<RequestView[]>([]);
  const [pendingDocs, setPendingDocs] = useState<GeneratedDocumentView[]>([]);
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [pendingRes, teamRes, docsRes] = await Promise.all([
      api.get<RequestView[]>("/requests/pending-director"),
      api.get<RequestView[]>("/requests/team-out"),
      api.get<GeneratedDocumentView[]>("/generated-documents/pending-director"),
    ]);
    setPending(pendingRes);
    setTeamOut(teamRes);
    setPendingDocs(docsRes);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function decide(id: string, decision: "APPROVED" | "REJECTED", note?: string) {
    await api.patch(`/requests/${id}/decision`, { decision, note });
    setRejectDraft((prev) => ({ ...prev, [id]: "" }));
    loadAll();
  }

  if (loading) return <div className="text-sm text-muted">Բեռնվում է…</div>;

  return (
    <div>
      <AccessRequestsCard />
      <PendingSignatureList
        title="Փաստաթղթեր՝ սպասում են Ձեր ստորագրությանը"
        docs={pendingDocs}
        signPath={(id) => `/generated-documents/${id}/sign-director`}
        onSigned={loadAll}
        showEmployeeName
      />
      <TeamOutCard requests={teamOut} />

      <div className="mb-2.5 font-serif text-[17px] text-ink">Հաստատման սպասող հայտ-դիմումներ ({pending.length})</div>
      {pending.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <Check size={15} />
          Ընթացիկ հայտ-դիմումներ չկան։
        </div>
      )}
      {pending.map((r) => {
        const emp = r.employee!;
        const balanceField = r.type === "VACATION" ? emp.balance : r.type === "DAYOFF" ? emp.dayOffBalance : null;
        const exceedsBalance = balanceField !== null && r.days > balanceField;
        return (
          <Card key={r.id} className="mb-3">
            <div className="flex flex-wrap justify-between gap-2.5">
              <div>
                <div className="text-[14.5px] font-bold text-ink">{emp.name}</div>
                <div className="text-[13px] text-muted">
                  {emp.position}
                  {balanceField !== null && ` · Մնացորդ մինչև հաստատումը՝ ${balanceField} oր`}
                </div>
                <div className="mt-1.5 text-[13.5px] text-ink">
                  {REQUEST_TYPE_LABELS[r.type]} · {fmtDateHY(r.start)} – {fmtDateHY(r.end)} ({r.days} oր)
                </div>
                {balanceField !== null && (
                  <div className="mt-0.5 text-xs text-seal">Հաստատումից հետո մնացորդ՝ {Math.max(0, balanceField - r.days)} oր</div>
                )}
                {r.reason && <div className="mt-0.5 text-[13px] italic text-muted">«{r.reason}»</div>}
                {exceedsBalance && (
                  <div className="mt-1.5 flex items-center gap-1 text-[12.5px] text-[#841320]">
                    <AlertCircle size={13} />
                    Հայտվող oրերը գերազանցում են մնացորդը
                  </div>
                )}
              </div>
              <div className="flex min-w-[200px] flex-col gap-2">
                <Button onClick={() => decide(r.id, "APPROVED")}>
                  <Check size={14} />
                  Հաստատել
                </Button>
                <textarea
                  placeholder="Մերժման հիմնավորում (պարտադիր)"
                  value={rejectDraft[r.id] || ""}
                  onChange={(e) => setRejectDraft({ ...rejectDraft, [r.id]: e.target.value })}
                  rows={2}
                  className="rounded-md border border-line px-2.5 py-1.5 text-[12.5px]"
                />
                <Button variant="danger" disabled={!rejectDraft[r.id]} onClick={() => decide(r.id, "REJECTED", rejectDraft[r.id])}>
                  <X size={14} />
                  Մերժել
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
