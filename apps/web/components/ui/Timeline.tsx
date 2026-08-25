import { fmtDateHY } from "@omboo/shared";

export interface HistoryEntryView {
  id: string;
  step: string;
  actorDisplayName: string;
  note?: string | null;
  createdAt: string;
}

function fmtDateTimeHY(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDateHY(iso.slice(0, 10))}, ${hh}:${mm}`;
}

export function Timeline({ history }: { history: HistoryEntryView[] }) {
  return (
    <div className="mt-3">
      {history.map((h, i) => (
        <div key={h.id} className="mb-3 flex gap-3">
          <div className="flex flex-col items-center">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-seal" />
            {i < history.length - 1 && <div className="mt-1 w-px flex-1 bg-line" />}
          </div>
          <div className="pb-0.5">
            <div className="text-sm font-semibold text-ink">{h.step}</div>
            <div className="text-xs text-muted">
              {h.actorDisplayName} · {fmtDateTimeHY(h.createdAt)}
            </div>
            {h.note && <div className="mt-1 text-[13px] italic text-[#4A4E5A]">«{h.note}»</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
