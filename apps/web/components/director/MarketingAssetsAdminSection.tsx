"use client";

import { useEffect, useState } from "react";
import { Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { api } from "../../lib/api-client";
import type { MarketingAssetView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MarketingAssetsAdminSection() {
  const [assets, setAssets] = useState<MarketingAssetView[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get<MarketingAssetView[]>("/platform-admin/marketing-assets").then(setAssets);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!title.trim() || !file) return;
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("title", title.trim());
      if (description.trim()) body.append("description", description.trim());
      body.append("file", file);
      const res = await fetch("/api/proxy/platform-admin/marketing-assets", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Չհաջողվեց վերբեռնել։");
        return;
      }
      setTitle("");
      setDescription("");
      setFile(null);
      load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/platform-admin/marketing-assets/${id}`);
    load();
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Մարքեթինգային նյութերի կառավարում</div>

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Upload size={13} />
          Վերբեռնել նոր նյութ
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Վերնագիր" className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm" />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Նկարագրություն (ըստ ցանկության)"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <Button disabled={uploading || !title.trim() || !file} onClick={upload}>
            {uploading ? "…" : "Վերբեռնել"}
          </Button>
          {!!error && <span className="text-[12.5px] text-[#841320]">{error}</span>}
        </div>
      </Card>

      {assets.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <ImageIcon size={15} />
          Դեռ նյութեր չեն ավելացվել։
        </div>
      )}

      {assets.map((a) => (
        <Card key={a.id} className="mb-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
              {a.description && <div className="text-[12.5px] text-muted">{a.description}</div>}
              <div className="mt-0.5 text-[11.5px] text-muted">
                {a.fileName} · {fmtSize(a.fileSize)}
              </div>
            </div>
            <button onClick={() => remove(a.id)} className="flex items-center gap-1 text-[12.5px] font-semibold text-[#841320]">
              <Trash2 size={13} />
              Ջնջել
            </button>
          </div>
        </Card>
      ))}
    </>
  );
}
