"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import {
  fmtDateHY,
  BILLING_CYCLE_LABELS,
  CONTRACT_YEAR_TIER_LABELS,
  COMMISSION_STATUS_LABELS,
  contractYearToTier,
  computePayoutEligibleDate,
  type CommissionStatus,
} from "@omboo/shared";
import { partnerApi } from "../../lib/partner-api-client";
import type { OrderView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";

const COMMISSION_STATUS_STYLE: Record<CommissionStatus, string> = {
  PENDING: "bg-[#FFF3D6] text-[#8A5A00]",
  PAID: "bg-[#DFF3E6] text-[#1E6B3C]",
};

export function CommissionStatementsSection() {
  const [orders, setOrders] = useState<OrderView[]>([]);

  useEffect(() => {
    partnerApi.get<OrderView[]>("/deals").then((all) => setOrders(all.filter((o) => o.status !== "CANCELLED")));
  }, []);

  const totalCommission = orders.reduce((sum, o) => sum + o.commissionAmountAmd, 0);

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Կոմիսիայի հաշվետվություն</div>

      {orders.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <Receipt size={15} />
          Դեռ գործարքներ չկան։
        </div>
      )}

      {orders.length > 0 && (
        <Card className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-seal">Ընդհանուր հաշվարկված կոմիսիա</div>
          <div className="mt-1 font-serif text-[20px] font-bold text-ink">{fmtAmd(totalCommission)}</div>
        </Card>
      )}

      {orders.map((o) => {
        const tier = contractYearToTier(o.contractYear);
        const payoutDate = computePayoutEligibleDate(o.createdAt.slice(0, 10), o.billingCycle);
        return (
          <Card key={o.id} className="mb-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13.5px] font-bold text-ink">{o.customerCompanyName}</div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMMISSION_STATUS_STYLE[o.commissionStatus]}`}>
                {COMMISSION_STATUS_LABELS[o.commissionStatus]}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted">
              <span>{o.package.name}</span>
              <span>→</span>
              <span>{BILLING_CYCLE_LABELS[o.billingCycle]}</span>
              <span>→</span>
              <span>{CONTRACT_YEAR_TIER_LABELS[tier]}</span>
              <span>→</span>
              <span className="font-semibold text-ink">{o.commissionRatePercent}%</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[13px]">
              <span className="text-muted">
                Գին՝ {fmtAmd(o.priceAmountAmd)} · {fmtDateHY(o.createdAt.slice(0, 10))}
                {o.commissionStatus === "PENDING" && <> · Վճարման ամսաթիվ՝ {fmtDateHY(payoutDate)}</>}
              </span>
              <span className="font-bold text-seal">{fmtAmd(o.commissionAmountAmd)}</span>
            </div>
          </Card>
        );
      })}
    </>
  );
}
