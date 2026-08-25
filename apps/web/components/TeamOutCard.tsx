import { Calendar } from "lucide-react";
import { fmtDateHY } from "@omboo/shared";
import { Card } from "./ui/Card";
import type { RequestView } from "../lib/types";

export function TeamOutCard({ requests }: { requests: RequestView[] }) {
  if (requests.length === 0) return null;
  return (
    <Card className="mb-4">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Calendar size={15} className="text-seal" />
        <div className="font-serif text-[15px] text-ink">Այս ամիս բացակայում են</div>
      </div>
      <div className="flex flex-col gap-1.5">
        {requests.map((r) => (
          <div key={r.id} className="flex justify-between text-[13px] text-[#4A4E5A]">
            <span>{r.employee?.name}</span>
            <span className="text-muted">
              {fmtDateHY(r.start)} – {fmtDateHY(r.end)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
