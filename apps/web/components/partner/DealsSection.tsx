"use client";

import { useEffect, useState } from "react";
import { Download, XCircle, Briefcase } from "lucide-react";
import { fmtDateHY, BILLING_CYCLE_LABELS, PARTNER_ORDER_STATUS_LABELS, INVOICE_STATUS_LABELS, type PartnerOrderStatus, type InvoiceStatus } from "@omboo/shared";
import { partnerApi, PartnerApiError } from "../../lib/partner-api-client";
import type { OrderView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const ORDER_STATUS_STYLE: Record<PartnerOrderStatus, string> = {
  PENDING_PAYMENT: "bg-[#FFF3D6] text-[#8A5A00]",
  PAID: "bg-[#DFF3E6] text-[#1E6B3C]",
  CANCELLED: "bg-[#F1E4E1] text-[#841320]",
};

const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-paper text-muted",
  SENT: "bg-[#E4ECF7] text-[#1B3A6B]",
  PAID: "bg-[#DFF3E6] text-[#1E6B3C]",
  CANCELLED: "bg-[#F1E4E1] text-[#841320]",
};

function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{text}</span>;
}

export function DealsSection() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState("");

  function load() {
    partnerApi.get<OrderView[]>("/deals").then(setOrders);
  }

  useEffect(load, []);

  async function download(orderId: string) {
    const { url, fileName } = await partnerApi.get<{ url: string; fileName: string }>(`/deals/${orderId}/invoice/download`);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  async function cancel(orderId: string) {
    setError("");
    try {
      await partnerApi.post(`/deals/${orderId}/cancel`);
      load();
    } catch (e) {
      setError(e instanceof PartnerApiError ? e.message : "Սխալ տեղի ունեցավ։");
    }
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Իմ գործարքները</div>
      {error && <div className="mb-2.5 text-[12.5px] text-[#841320]">{error}</div>}

      {orders.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <Briefcase size={15} />
          Դեռ գործարքներ չկան։
        </div>
      )}

      {orders.map((o) => (
        <Card key={o.id} className="mb-3">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <div className="text-[14.5px] font-bold text-ink">
                {o.package.name} · {BILLING_CYCLE_LABELS[o.billingCycle]}
              </div>
              <div className="mt-0.5 text-[13px] text-muted">
                {o.customerCompanyName} · {o.customerContactName} · {o.customerEmail}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge text={PARTNER_ORDER_STATUS_LABELS[o.status]} className={ORDER_STATUS_STYLE[o.status]} />
                {o.invoice && <Badge text={INVOICE_STATUS_LABELS[o.invoice.status]} className={INVOICE_STATUS_STYLE[o.invoice.status]} />}
                <span className="text-[12px] text-muted">{fmtDateHY(o.createdAt.slice(0, 10))}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold text-ink">{fmtAmd(o.priceAmountAmd)}</div>
              <div className="text-[12px] text-seal">Կոմիսիա՝ {fmtAmd(o.commissionAmountAmd)} ({o.commissionRatePercent}%)</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-2.5">
            {o.invoice?.pdfFileKey && (
              <button onClick={() => download(o.id)} className="flex items-center gap-1 text-[12.5px] font-semibold text-seal">
                <Download size={13} />
                Հաշիվ-ապրանքագիր
              </button>
            )}
            {o.status === "PENDING_PAYMENT" && (
              <Button variant="danger" className="ml-auto px-2.5 py-1.5 text-[12.5px]" onClick={() => cancel(o.id)}>
                <XCircle size={13} />
                Չեղարկել
              </Button>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}
