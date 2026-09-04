"use client";

import { useEffect, useState } from "react";
import { Download, Image as ImageIcon } from "lucide-react";
import { partnerApi } from "../../lib/partner-api-client";
import type { MarketingAssetView } from "../../lib/types";
import { Card } from "../ui/Card";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MarketingMaterialsSection() {
  const [assets, setAssets] = useState<MarketingAssetView[]>([]);

  useEffect(() => {
    partnerApi.get<MarketingAssetView[]>("/marketing-assets").then(setAssets);
  }, []);

  async function download(id: string, fileName: string) {
    const { url } = await partnerApi.get<{ url: string; fileName: string }>(`/marketing-assets/${id}/download`);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Մարքեթինգային նյութեր</div>

      {assets.length === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <ImageIcon size={15} />
          Դեռ նյութեր չեն ավելացվել։
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {assets.map((a) => (
          <Card key={a.id}>
            <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
            {a.description && <div className="mt-0.5 text-[12.5px] text-muted">{a.description}</div>}
            <div className="mt-1.5 text-[11.5px] text-muted">
              {a.fileName} · {fmtSize(a.fileSize)}
            </div>
            <button onClick={() => download(a.id, a.fileName)} className="mt-2.5 flex items-center gap-1 text-[12.5px] font-semibold text-seal">
              <Download size={13} />
              Ներբեռնել
            </button>
          </Card>
        ))}
      </div>
    </>
  );
}
