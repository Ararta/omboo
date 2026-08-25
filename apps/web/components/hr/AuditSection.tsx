"use client";

import { useEffect, useState } from "react";
import { fmtDateHY, REQUEST_TYPE_LABELS } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { RequestView } from "../../lib/types";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

export function AuditSection() {
  const [requests, setRequests] = useState<RequestView[]>([]);

  useEffect(() => {
    api.get<RequestView[]>("/requests").then(setRequests);
  }, []);

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Աուդիտի մատյան — բոլոր հայտ-դիմումները</div>
      <Card>
        {requests.length === 0 && <div className="text-sm text-muted">Դատարկ է։</div>}
        {requests.map((r, i) => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <div className="text-[13px]">
              <span className="font-semibold text-ink">{r.employee?.name}</span>
              <span className="text-muted">
                {" "}
                · {REQUEST_TYPE_LABELS[r.type]} · {fmtDateHY(r.start)}–{fmtDateHY(r.end)}
              </span>
              {r.orderNumber && <span className="font-mono text-seal"> · {r.orderNumber}</span>}
            </div>
            <StatusPill status={r.status} />
          </div>
        ))}
      </Card>
    </>
  );
}
