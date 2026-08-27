"use client";

import { useState } from "react";
import { FileSignature, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../lib/api-client";
import type { GeneratedDocumentView } from "../lib/types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

interface PendingSignatureListProps {
  title: string;
  docs: GeneratedDocumentView[];
  signPath: (id: string) => string;
  onSigned: () => void;
  showEmployeeName?: boolean;
}

// Shared by the employee's "sign my documents" card and the director's "sign after the employee
// did" card — same click-to-confirm flow (expand to read the filled-in content, then a separate
// confirm button), just a different sign endpoint and whether the employee's name is shown.
export function PendingSignatureList({ title, docs, signPath, onSigned, showEmployeeName }: PendingSignatureListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  if (docs.length === 0) return null;

  async function sign(id: string) {
    setSigningId(id);
    try {
      await api.post(signPath(id));
      onSigned();
    } finally {
      setSigningId(null);
    }
  }

  return (
    <Card className="mb-4" style={{ borderColor: "#E8C9C9", background: "#FBF5F5" }}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <FileSignature size={15} color="#841320" />
        <div className="font-serif text-[15px] text-ink">{title}</div>
      </div>
      {docs.map((d, i) => {
        const expanded = expandedId === d.id;
        return (
          <div key={d.id} className={`py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button onClick={() => setExpandedId(expanded ? null : d.id)} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {d.title}
                {showEmployeeName && d.employee && <span className="font-normal text-muted"> · {d.employee.name}</span>}
              </button>
              {expanded && (
                <Button onClick={() => sign(d.id)} disabled={signingId === d.id} className="!px-3 !py-1.5 text-[12.5px]">
                  {signingId === d.id ? "…" : "Ստորագրել այժմ"}
                </Button>
              )}
            </div>
            {expanded && (
              <div className="rich-text-content mt-2.5 rounded-md border border-line bg-white px-3 py-2.5" dangerouslySetInnerHTML={{ __html: d.contentHtml }} />
            )}
          </div>
        );
      })}
    </Card>
  );
}
