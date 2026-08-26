"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Stamp } from "lucide-react";
import { fmtDateHY } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { RequestView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function RecallsSection() {
  const [recallable, setRecallable] = useState<RequestView[]>([]);
  const [toFinalize, setToFinalize] = useState<RequestView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { end?: string; reason?: string }>>({});
  const [error, setError] = useState("");

  async function load() {
    const [a, b] = await Promise.all([
      api.get<RequestView[]>("/recalls/recallable"),
      api.get<RequestView[]>("/recalls/to-finalize"),
    ]);
    setRecallable(a);
    setToFinalize(b);
  }

  useEffect(() => {
    load();
  }, []);

  async function requestRecall(requestId: string) {
    const draft = drafts[requestId];
    if (!draft?.end || !draft.reason) return;
    setError("");
    try {
      await api.post(`/recalls/${requestId}/request`, { requestedEnd: draft.end, reason: draft.reason });
      setDrafts((prev) => ({ ...prev, [requestId]: {} }));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ։");
    }
  }

  async function finalize(requestId: string) {
    await api.post(`/recalls/${requestId}/finalize`);
    load();
  }

  return (
    <>
      {recallable.length > 0 && (
        <>
          <div className="my-6 font-serif text-[17px] text-ink">Հետկանչել ընթացիկ/գալիք արձակուրդից</div>
          {error && <div className="mb-2 text-[12.5px] text-[#841320]">{error}</div>}
          {recallable.map((r) => {
            const draft = drafts[r.id] || {};
            return (
              <Card key={r.id} className="mb-3">
                <div className="text-sm font-bold text-ink">{r.employee?.name}</div>
                <div className="mb-2 text-[12.5px] text-muted">
                  {fmtDateHY(r.start)} – {fmtDateHY(r.end)} · {r.orderNumber}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    min={r.start.slice(0, 10)}
                    max={r.end.slice(0, 10)}
                    value={draft.end || ""}
                    onChange={(ev) => setDrafts({ ...drafts, [r.id]: { ...draft, end: ev.target.value } })}
                    className="w-[140px] rounded-md border border-line px-2.5 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Հիմնավորում"
                    value={draft.reason || ""}
                    onChange={(ev) => setDrafts({ ...drafts, [r.id]: { ...draft, reason: ev.target.value } })}
                    className="min-w-[160px] flex-1 rounded-md border border-line px-2.5 py-1.5 text-sm"
                  />
                  <Button variant="ghost" disabled={!draft.end || !draft.reason} onClick={() => requestRecall(r.id)}>
                    <RotateCcw size={13} />
                    Հետկանչել
                  </Button>
                </div>
              </Card>
            );
          })}
        </>
      )}

      {toFinalize.length > 0 && (
        <>
          <div className="my-6 font-serif text-[17px] text-ink">Հետկանչման հրամանի կազմում</div>
          {toFinalize.map((r) => (
            <Card key={r.id} className="mb-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="text-sm font-bold text-ink">{r.employee?.name}</div>
                  <div className="text-[12.5px] text-muted">
                    Աշխատողը համաձայնվել է վերադառնալ {fmtDateHY(r.recall!.requestedEnd)}-ից (փոխարեն {fmtDateHY(r.end)})
                  </div>
                </div>
                <Button variant="seal" onClick={() => finalize(r.id)}>
                  <Stamp size={14} />
                  Կազմել հետկանչման հրամանը
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
