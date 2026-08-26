"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Check, X } from "lucide-react";
import { api } from "../lib/api-client";
import type { PendingUserView } from "../lib/types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

const ROLE_LABELS: Record<string, string> = {
  HR: "ՄՌԿ մասնագետ",
  DIRECTOR: "Տնoրեն",
  EMPLOYEE: "Աշխատող",
};

export function AccessRequestsCard() {
  const [requests, setRequests] = useState<PendingUserView[] | null>(null);

  async function load() {
    setRequests(await api.get<PendingUserView[]>("/auth/pending-users"));
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    await api.post(`/auth/pending-users/${id}/${action}`);
    load();
  }

  if (!requests || requests.length === 0) return null;

  return (
    <Card className="mb-5 border-seal/30 bg-seal/5">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-seal">
        <ShieldCheck size={14} />
        Մուտքի հայտեր ({requests.length})
      </div>
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3.5 py-3">
            <div>
              <div className="text-[13.5px] font-semibold text-ink">{r.name || r.email}</div>
              <div className="text-[12px] text-muted">
                {r.email} · {ROLE_LABELS[r.role] ?? r.role} իրավունքի հայտ
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => decide(r.id, "approve")}>
                <Check size={14} />
                Հաստատել
              </Button>
              <Button variant="danger" onClick={() => decide(r.id, "reject")}>
                <X size={14} />
                Մերժել
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
