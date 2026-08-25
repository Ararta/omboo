"use client";

import { useEffect, useState } from "react";
import { FileText, Stamp } from "lucide-react";
import { fmtDateHY, REQUEST_TYPE_LABELS, type OrderDocumentViewModel } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { RequestView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

function OrderPreviewCard({ data }: { data: OrderDocumentViewModel }) {
  return (
    <div className="rounded-md border border-line bg-paper p-5" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
      <div className="text-lg font-bold" style={{ color: "#1B3E8C" }}>
        {data.companyName}
      </div>
      <div className="my-1 border-b-2 border-dotted" style={{ borderColor: "#1B3E8C" }} />
      <div className="mb-4 text-xs text-[#333]">
        {data.address}, {data.phone}, {data.email}
      </div>
      <div className="mb-1 text-center text-lg font-bold tracking-wide">ՀՐԱՄԱՆ ԹԻՎ {data.orderNumber}</div>
      <div className="mb-4 flex justify-between text-sm">
        <span>{data.issueLocation}</span>
        <span>{data.issueDateHY}</span>
      </div>
      <div className="mb-3 text-center text-sm font-bold">
        «{data.companyName}»-ի աշխատակից {data.employeeName}ին ամենամյա արձակուրդ տրամադրելու վերաբերյալ
      </div>
      <div className="mb-3 text-center text-sm font-bold tracking-[3px]">ՀՐԱՄԱՅՈՒՄ ԵՄ</div>
      <ul className="mb-3 list-disc pl-5 text-sm">
        <li>
          {data.workYearStartHY} – {data.workYearEndHY} աշխատանքային տարվա համար՝ {data.days} աշխ. oր
        </li>
        <li>Սկիզբ — {data.startHY}, ավարտ — {data.endHY}, վերադարձ՝ {data.returnDateHY}</li>
      </ul>
      <div className="mt-6 flex items-end justify-between text-sm">
        <div>«{data.companyName}» տնoրեն</div>
        <div className="text-center">
          {data.signed && data.directorSignatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.directorSignatureUrl} alt="ստորագրություն" className="mx-auto mb-1 h-12 object-contain" />
          )}
          <div className="border-t border-black pt-1">{data.directorName}</div>
        </div>
      </div>
    </div>
  );
}

export function OrdersSection() {
  const [pending, setPending] = useState<RequestView[]>([]);
  const [preview, setPreview] = useState<{ requestId: string; data: OrderDocumentViewModel; signed: boolean } | null>(null);

  async function load() {
    setPending(await api.get<RequestView[]>("/requests/pending-hr"));
  }

  useEffect(() => {
    load();
  }, []);

  async function openPreview(requestId: string) {
    const data = await api.get<OrderDocumentViewModel>(`/orders/${requestId}/preview`);
    setPreview({ requestId, data, signed: false });
  }

  async function confirmAndSign() {
    if (!preview) return;
    const result = await api.post<{ orderNumber: string }>(`/orders/${preview.requestId}/confirm`);
    setPreview((prev) => (prev ? { ...prev, signed: true, data: { ...prev.data, orderNumber: result.orderNumber, signed: true } } : prev));
    load();
  }

  return (
    <>
      {preview && (
        <Card className="mb-5" style={{ borderColor: "#6B3FA0" }}>
          <div className="mb-3 flex items-center gap-1.5">
            <FileText size={15} className="text-seal" />
            <div className="font-serif text-[15px] text-ink">
              {preview.signed ? "Հրամանը ստորագրված և ուղարկված է" : "Հրամանի նախադիտում — ստուգեք մինչև ստորագրելը"}
            </div>
          </div>
          <OrderPreviewCard data={preview.data} />
          <div className="mt-3.5 flex flex-wrap gap-2">
            {!preview.signed ? (
              <>
                <Button variant="seal" onClick={confirmAndSign}>
                  <Stamp size={14} />
                  Հաստատել և ստորագրել
                </Button>
                <Button variant="ghost" onClick={() => setPreview(null)}>
                  Չեղարկել
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => window.open(`/api/proxy/orders/${preview.requestId}/pdf`, "_blank")}>
                  Ներբեռնել PDF
                </Button>
                <Button variant="ghost" onClick={() => setPreview(null)}>
                  Փակել
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="mb-2.5 font-serif text-[17px] text-ink">Հրամանի կազմման սպասող ({pending.length})</div>
      {pending.length === 0 && <div className="mb-5 text-sm text-muted">Ընթացիկ գործողություններ չկան։</div>}
      {pending.map((r) => (
        <Card key={r.id} className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <div className="text-[14.5px] font-bold text-ink">{r.employee?.name}</div>
              <div className="text-[13px] text-muted">
                {REQUEST_TYPE_LABELS[r.type]} · {fmtDateHY(r.start)} – {fmtDateHY(r.end)} ({r.days} oր) · հաստատված է
              </div>
            </div>
            <Button variant="seal" onClick={() => openPreview(r.id)}>
              <Stamp size={14} />
              Կազմել հրամանը
            </Button>
          </div>
        </Card>
      ))}
    </>
  );
}
