"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { fmtDateHY, BILLING_CYCLE_LABELS, PARTNER_ORDER_STATUS_LABELS, INVOICE_STATUS_LABELS, type PartnerOrderStatus, type InvoiceStatus } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { OrderView, PartnerView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type PartnerWithCount = PartnerView & { _count: { orders: number } };

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

export function PartnersOverviewSection() {
  const [partners, setPartners] = useState<PartnerWithCount[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  function load() {
    Promise.all([
      api.get<PartnerWithCount[]>("/platform-admin/partners-overview/partners"),
      api.get<OrderView[]>("/platform-admin/partners-overview/orders"),
    ]).then(([p, o]) => {
      setPartners(p);
      setOrders(o);
    });
  }

  useEffect(load, []);

  async function markPaid(invoiceId: string) {
    setMarking(invoiceId);
    try {
      await api.post(`/platform-admin/invoices/${invoiceId}/mark-paid`);
      load();
    } finally {
      setMarking(null);
    }
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Գործընկերների ընդհանուր տեսություն</div>

      <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
        <Users size={13} />
        Գործընկեր կազմակերպություններ ({partners.length})
      </div>
      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {partners.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
              <Building2 size={14} className="text-muted" />
              {p.companyName}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              {p.contactName} · {p.email} · {p.phone}
            </div>
            <div className="mt-1 text-[12px] text-ink">
              {p._count.orders} գործարք · Գրանցվել է {fmtDateHY(p.createdAt.slice(0, 10))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-2.5 mt-6 text-[11px] font-semibold uppercase tracking-wider text-seal">Բոլոր գործարքները</div>
      {orders.map((o) => (
        <Card key={o.id} className="mb-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <div className="text-[13.5px] font-bold text-ink">
                {o.partner?.companyName} <span className="font-normal text-muted">→ {o.customerCompanyName}</span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {o.package.name} · {BILLING_CYCLE_LABELS[o.billingCycle]} · {fmtDateHY(o.createdAt.slice(0, 10))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>{PARTNER_ORDER_STATUS_LABELS[o.status]}</span>
                {o.invoice && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${INVOICE_STATUS_STYLE[o.invoice.status]}`}>
                    {INVOICE_STATUS_LABELS[o.invoice.status]}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[14.5px] font-bold text-ink">{fmtAmd(o.priceAmountAmd)}</div>
              <div className="text-[12px] text-seal">Կոմիսիա՝ {fmtAmd(o.commissionAmountAmd)}</div>
              {o.invoice && o.invoice.status === "SENT" && (
                <Button variant="seal" className="mt-1.5 px-2.5 py-1.5 text-[12px]" disabled={marking === o.invoice.id} onClick={() => markPaid(o.invoice!.id)}>
                  <CheckCircle2 size={13} />
                  Նշել որպես վճարված
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
