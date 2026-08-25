"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "../lib/api-client";
import type { NotificationView } from "../lib/types";

export function NotificationBell() {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      setItems(await api.get<NotificationView[]>("/notifications"));
    } catch {
      // best-effort; notifications are non-critical UI
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    await api.post("/notifications/mark-all-read");
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-line bg-white"
      >
        <Bell size={16} className="text-ink" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A02E2E] px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 max-h-[340px] w-[300px] overflow-y-auto rounded-[10px] border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="text-xs font-bold text-ink">Ծանուցումներ</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11.5px] text-seal">
                Նշել բոլորը կարդացված
              </button>
            )}
          </div>
          {items.length === 0 && <div className="p-4 text-sm text-muted">Ծանուցումներ չկան։</div>}
          {items.map((n) => (
            <div key={n.id} className={`border-b border-line px-3.5 py-2.5 ${n.read ? "bg-white" : "bg-[#F7F4FC]"}`}>
              <div className="text-[12.5px] text-ink">{n.text}</div>
              <div className="mt-0.5 text-[11px] text-muted">{new Date(n.createdAt).toLocaleString("hy-AM")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
