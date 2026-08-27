"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { GENERATED_DOCUMENT_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS, type TemplateCategory } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { DocumentTemplateView, EmployeeView, GeneratedDocumentView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { RichTextEditor } from "../ui/RichTextEditor";

const STATUS_COLORS: Record<GeneratedDocumentView["status"], { bg: string; fg: string }> = {
  PENDING_EMPLOYEE_SIGNATURE: { bg: "#F7EED0", fg: "#A9860F" },
  PENDING_DIRECTOR_SIGNATURE: { bg: "#F3EAE6", fg: "#241619" },
  COMPLETED: { bg: "#E6F4EC", fg: "#1F7A4D" },
  CANCELLED: { bg: "#F5E1E0", fg: "#841320" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function TemplateCategoryPanel({ category }: { category: TemplateCategory }) {
  const [templates, setTemplates] = useState<DocumentTemplateView[]>([]);
  const [docs, setDocs] = useState<GeneratedDocumentView[]>([]);
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Template editor (create or edit)
  const [editingId, setEditingId] = useState<string | null | "new">(null);
  const [nameDraft, setNameDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Generate-from-template flow
  const [generatingTemplate, setGeneratingTemplate] = useState<DocumentTemplateView | null>(null);
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [generateEmployeeId, setGenerateEmployeeId] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  async function load() {
    const [templatesRes, docsRes, employeesRes] = await Promise.all([
      api.get<DocumentTemplateView[]>(`/document-templates?category=${category}`),
      api.get<GeneratedDocumentView[]>(`/generated-documents?category=${category}`),
      api.get<EmployeeView[]>("/employees"),
    ]);
    setTemplates(templatesRes);
    setDocs(docsRes);
    setEmployees(employeesRes);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function startCreate() {
    setEditingId("new");
    setNameDraft("");
    setContentDraft("");
    setError("");
  }

  function startEdit(t: DocumentTemplateView) {
    setEditingId(t.id);
    setNameDraft(t.name);
    setContentDraft(t.contentHtml);
    setError("");
  }

  async function saveTemplate() {
    if (!nameDraft.trim() || !contentDraft.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editingId === "new") {
        await api.post("/document-templates", { name: nameDraft.trim(), category, contentHtml: contentDraft });
      } else if (editingId) {
        await api.patch(`/document-templates/${editingId}`, { name: nameDraft.trim(), contentHtml: contentDraft });
      }
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Չհաջողվեց պահպանել։");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    setError("");
    try {
      await api.del(`/document-templates/${id}`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Չհաջողվեց ջնջել։");
    }
  }

  async function openGenerate(t: DocumentTemplateView) {
    setGeneratingTemplate(t);
    setGenerateEmployeeId("");
    setCustomFieldValues({});
    setError("");
    const fields = await api.get<string[]>(`/document-templates/${t.id}/custom-fields`);
    setCustomFieldNames(fields);
  }

  async function submitGenerate() {
    if (!generatingTemplate || !generateEmployeeId) return;
    setGenerating(true);
    setError("");
    try {
      await api.post(`/document-templates/${generatingTemplate.id}/generate`, {
        employeeId: generateEmployeeId,
        customFields: customFieldValues,
      });
      setGeneratingTemplate(null);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Չհաջողվեց ստեղծել փաստաթուղթը։");
    } finally {
      setGenerating(false);
    }
  }

  async function cancelDoc(id: string) {
    await api.post(`/generated-documents/${id}/cancel`);
    load();
  }

  if (loading) return <div className="text-[12.5px] text-muted">Բեռնվում է…</div>;

  return (
    <>
      {!!error && <div className="mb-3 text-[12.5px] text-[#841320]">{error}</div>}

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
            <FileText size={13} />
            Ձևանմուշներ — {TEMPLATE_CATEGORY_LABELS[category]}
          </div>
          {editingId === null && (
            <Button variant="ghost" onClick={startCreate} className="!px-2.5 !py-1 text-[12px]">
              <Plus size={13} />
              Նոր ձևանմուշ
            </Button>
          )}
        </div>

        {editingId !== null && (
          <div className="mb-3 rounded-md border border-line bg-paper p-3">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ձևանմուշի անվանում"
              className="mb-2 w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
            />
            <RichTextEditor value={contentDraft} onChange={setContentDraft} />
            <div className="mt-2.5 flex items-center gap-2">
              <Button onClick={saveTemplate} disabled={saving || !nameDraft.trim() || !contentDraft.trim()} className="!px-3 !py-1.5 text-[12.5px]">
                {saving ? "…" : "Պահպանել"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingId(null)} className="!px-3 !py-1.5 text-[12.5px]">
                Չեղարկել
              </Button>
            </div>
          </div>
        )}

        {templates.length === 0 && editingId === null && (
          <div className="text-[12.5px] text-muted">Դեռ ձևանմուշներ չկան այս կատեգորիայում։</div>
        )}
        {templates.map((t, i) => (
          <div key={t.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="text-[13px] font-semibold text-ink">{t.name}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => openGenerate(t)} className="flex items-center gap-1 text-[12.5px] font-semibold text-seal">
                <Send size={13} />
                Ստեղծել փաստաթուղթ
              </button>
              <button onClick={() => startEdit(t)} className="flex items-center gap-1 text-[12.5px] font-semibold text-ink">
                <Pencil size={13} />
                Խմբագրել
              </button>
              <button onClick={() => deleteTemplate(t.id)} className="flex items-center gap-1 text-[12.5px] font-semibold text-[#841320]">
                <Trash2 size={13} />
                Ջնջել
              </button>
            </div>
          </div>
        ))}
      </Card>

      {generatingTemplate && (
        <Card className="mb-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-seal">
              Փաստաթուղթ՝ «{generatingTemplate.name}»-ից
            </div>
            <button onClick={() => setGeneratingTemplate(null)} className="text-muted">
              <X size={16} />
            </button>
          </div>
          <label className="mb-1 block text-[11.5px] text-muted">Աշխատող</label>
          <select
            value={generateEmployeeId}
            onChange={(e) => setGenerateEmployeeId(e.target.value)}
            className="mb-2.5 w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          >
            <option value="">Ընտրեք աշխատողին</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          {customFieldNames.map((field) => (
            <div key={field} className="mb-2.5">
              <label className="mb-1 block text-[11.5px] text-muted">{field}</label>
              <input
                value={customFieldValues[field] ?? ""}
                onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
              />
            </div>
          ))}
          <Button onClick={submitGenerate} disabled={generating || !generateEmployeeId} className="!px-3 !py-1.5 text-[12.5px]">
            {generating ? "…" : "Ուղարկել աշխատողի ստորագրմանը"}
          </Button>
        </Card>
      )}

      <Card>
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-seal">Ստեղծված փաստաթղթեր</div>
        {docs.length === 0 && <div className="text-[12.5px] text-muted">Դեռ փաստաթղթեր չկան։</div>}
        {docs.map((d, i) => {
          const colors = STATUS_COLORS[d.status];
          return (
            <div key={d.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
              <div className="text-[13px]">
                <span className="font-semibold text-ink">{d.title}</span>
                <span className="text-muted"> · {d.employee?.name} · {fmtDate(d.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: colors.bg, color: colors.fg }}>
                  {GENERATED_DOCUMENT_STATUS_LABELS[d.status]}
                </span>
                {d.status !== "COMPLETED" && d.status !== "CANCELLED" && (
                  <button onClick={() => cancelDoc(d.id)} className="text-[12px] font-semibold text-[#841320]">
                    Չեղարկել
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}
