"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Download, Trash2, Upload } from "lucide-react";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { DocumentView, EmployeeView } from "../../lib/types";
import { Card } from "../ui/Card";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function DocumentsSection() {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [docs, setDocs] = useState<DocumentView[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [uploadEmployeeId, setUploadEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("CONTRACT");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [empRes, docRes] = await Promise.all([
      api.get<EmployeeView[]>("/employees"),
      api.get<DocumentView[]>(`/documents${employeeFilter !== "ALL" ? `?employeeId=${employeeFilter}` : ""}`),
    ]);
    setEmployees(empRes);
    setDocs(docRes);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter]);

  async function upload() {
    if (!uploadEmployeeId || !title.trim() || !file) return;
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("employeeId", uploadEmployeeId);
      body.append("title", title.trim());
      body.append("category", category);
      body.append("file", file);
      const res = await fetch("/api/proxy/documents", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Չհաջողվեց վերբեռնել։");
        return;
      }
      setTitle("");
      setFile(null);
      load();
    } finally {
      setUploading(false);
    }
  }

  async function download(id: string, fileName: string) {
    const { url } = await api.get<{ url: string; fileName: string }>(`/documents/${id}/download`);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  async function remove(id: string) {
    await api.del(`/documents/${id}`);
    load();
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Փաստաթղթերի գրադարան</div>

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Upload size={13} />
          Վերբեռնել նոր փաստաթուղթ
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={uploadEmployeeId}
            onChange={(e) => setUploadEmployeeId(e.target.value)}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value="">Ընտրեք աշխատողին</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Վերնագիր"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <button
            onClick={upload}
            disabled={uploading || !uploadEmployeeId || !title.trim() || !file}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "…" : "Վերբեռնել"}
          </button>
          {!!error && <span className="text-[12.5px] text-[#841320]">{error}</span>}
        </div>
      </Card>

      <Card>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
            <FolderOpen size={13} />
            Բոլոր փաստաթղթերը
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value="ALL">Բոլոր աշխատողները</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {docs.length === 0 && <div className="text-[12.5px] text-muted">Փաստաթղթեր չկան։</div>}
        {docs.map((doc, i) => (
          <div key={doc.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <div className="text-[13px]">
              <span className="font-semibold text-ink">{doc.title}</span>
              <span className="text-muted">
                {" "}
                · {doc.employee?.name} · {DOCUMENT_CATEGORY_LABELS[doc.category]} · {fmtSize(doc.fileSize)} · {fmtDate(doc.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => download(doc.id, doc.fileName)} className="flex items-center gap-1 text-[12.5px] font-semibold text-seal">
                <Download size={13} />
                Ներբեռնել
              </button>
              <button onClick={() => remove(doc.id)} className="flex items-center gap-1 text-[12.5px] font-semibold text-[#841320]">
                <Trash2 size={13} />
                Ջնջել
              </button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
