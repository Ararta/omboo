"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Mail } from "lucide-react";
import { partnerApi } from "../../lib/partner-api-client";
import type { PartnerOverviewView } from "../../lib/types";
import { Card } from "../ui/Card";

export function SupportSection() {
  const [overview, setOverview] = useState<PartnerOverviewView | null>(null);

  useEffect(() => {
    partnerApi.get<PartnerOverviewView>("/partners/me/overview").then(setOverview);
  }, []);

  const hasAssignedContact = !!(overview?.assignedContactName || overview?.assignedContactEmail);

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Աջակցություն</div>

      <Card className="mb-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <LifeBuoy size={13} />
          {hasAssignedContact ? "Ձեր կցված կոնտակտը" : "Ընդհանուր կապի հասցե"}
        </div>
        {hasAssignedContact ? (
          <div className="text-[13.5px] text-ink">
            {overview!.assignedContactName}
            {overview!.assignedContactEmail && (
              <>
                {" "}
                ·{" "}
                <a href={`mailto:${overview!.assignedContactEmail}`} className="font-semibold text-seal underline">
                  {overview!.assignedContactEmail}
                </a>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[13.5px] text-ink">
            <Mail size={14} className="text-muted" />
            <a href="mailto:partners@omboo.am" className="font-semibold text-seal underline">
              partners@omboo.am
            </a>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-1.5 text-[13.5px] font-bold text-ink">Ինչպե՞ս աշխատել գործընկերային հարթակում</div>
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">
          <li>«Նոր գործարք» բաժնում ընտրեք փաթեթը և վճարման ցիկլը, լրացրեք պատվիրատու կազմակերպության տվյալները։</li>
          <li>Համակարգն ինքնաշխատ գեներացնում և ուղարկում է կանխավճարի հաշիվը հաճախորդի էլ. փոստին։</li>
          <li>Ձեր կոմիսիան հաշվարկվում է ինքնաշխատ՝ ըստ փաթեթի, ցիկլի և պայմանագրի տարվա, և երևում է «Կոմիսիայի հաշվետվություն» բաժնում։</li>
          <li>«Մարքեթինգային նյութեր» բաժնում հասանելի են վաճառքը հեշտացնող պատրաստի նյութեր։</li>
        </ul>
      </Card>
    </>
  );
}
