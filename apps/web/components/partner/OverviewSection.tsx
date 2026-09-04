"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Clock, CheckCircle2, CalendarClock, UserRound } from "lucide-react";
import { fmtDateHY } from "@omboo/shared";
import { partnerApi } from "../../lib/partner-api-client";
import type { PartnerOverviewView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";

function StatCard({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
        <Icon size={13} />
        {label}
      </div>
      <div className="font-serif text-[22px] font-bold text-ink">{value}</div>
    </Card>
  );
}

export function OverviewSection() {
  const [data, setData] = useState<PartnerOverviewView | null>(null);

  useEffect(() => {
    partnerApi.get<PartnerOverviewView>("/partners/me/overview").then(setData);
  }, []);

  if (!data) return <div className="text-sm text-muted">Բեռնվում է…</div>;

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Ընդհանուր տեսություն</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Այս ամսվա վաճառքներ" value={fmtAmd(data.thisMonthSalesAmd)} />
        <StatCard icon={Clock} label="Սպասվող կոմիսիա" value={fmtAmd(data.pendingCommissionAmd)} />
        <StatCard icon={CheckCircle2} label="Վճարված կոմիսիա" value={fmtAmd(data.paidCommissionAmd)} />
        <StatCard icon={CalendarClock} label="Հաջորդ վճարման ամսաթիվ" value={data.nextPayoutDate ? fmtDateHY(data.nextPayoutDate) : "—"} />
      </div>

      {(data.assignedContactName || data.assignedContactEmail) && (
        <Card className="mt-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
            <UserRound size={13} />
            Ձեր կցված կոնտակտը Omboo-ում
          </div>
          <div className="text-[13.5px] text-ink">
            {data.assignedContactName}
            {data.assignedContactEmail && (
              <>
                {" "}
                ·{" "}
                <a href={`mailto:${data.assignedContactEmail}`} className="font-semibold text-seal underline">
                  {data.assignedContactEmail}
                </a>
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
