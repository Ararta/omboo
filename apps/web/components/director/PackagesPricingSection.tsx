"use client";

import { useEffect, useState } from "react";
import { PackagePlus, Pencil, Save, X } from "lucide-react";
import { BILLING_CYCLES, BILLING_CYCLE_LABELS, type BillingCycle } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { PackageView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type PriceDraft = Record<BillingCycle, string>;

function emptyPriceDraft(): PriceDraft {
  return { MONTHLY: "", QUARTERLY: "", YEARLY: "" };
}

function priceDraftFrom(pkg: PackageView): PriceDraft {
  const draft = emptyPriceDraft();
  for (const p of pkg.prices) draft[p.billingCycle] = String(p.amountAmd);
  return draft;
}

function pricesPayload(draft: PriceDraft) {
  return BILLING_CYCLES.filter((c) => Number(draft[c]) > 0).map((c) => ({ billingCycle: c, amountAmd: Number(draft[c]) }));
}

export function PackagesPricingSection() {
  const [packages, setPackages] = useState<PackageView[]>([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; description: string; isActive: boolean; prices: PriceDraft } | null>(null);
  const [saving, setSaving] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrices, setNewPrices] = useState<PriceDraft>(emptyPriceDraft());
  const [creating, setCreating] = useState(false);

  function load() {
    api.get<PackageView[]>("/platform-admin/packages").then(setPackages);
  }

  useEffect(load, []);

  async function createPackage() {
    setError("");
    const prices = pricesPayload(newPrices);
    if (!newKey.trim() || !newName.trim() || prices.length === 0) return;
    setCreating(true);
    try {
      await api.post("/platform-admin/packages", { key: newKey.trim().toUpperCase(), name: newName.trim(), description: newDescription.trim() || undefined, isActive: true, prices });
      setNewKey("");
      setNewName("");
      setNewDescription("");
      setNewPrices(emptyPriceDraft());
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ։");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(pkg: PackageView) {
    setEditingId(pkg.id);
    setEditDraft({ name: pkg.name, description: pkg.description ?? "", isActive: pkg.isActive, prices: priceDraftFrom(pkg) });
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setError("");
    setSaving(true);
    try {
      await api.patch(`/platform-admin/packages/${id}`, {
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || undefined,
        isActive: editDraft.isActive,
        prices: pricesPayload(editDraft.prices),
      });
      setEditingId(null);
      setEditDraft(null);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ։");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Փաթեթներ և գներ</div>
      {error && <div className="mb-2.5 text-[12.5px] text-[#841320]">{error}</div>}

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <PackagePlus size={13} />
          Նոր փաթեթ
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key (օր.՝ STANDARD)"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm uppercase"
          />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Անվանում" className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm" />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Նկարագրություն (ըստ ցանկության)"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BILLING_CYCLES.map((c) => (
            <input
              key={c}
              type="number"
              min={0}
              value={newPrices[c]}
              onChange={(e) => setNewPrices({ ...newPrices, [c]: e.target.value })}
              placeholder={`${BILLING_CYCLE_LABELS[c]} գին (֏)`}
              className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
            />
          ))}
        </div>
        <Button className="mt-2.5" disabled={creating || !newKey.trim() || !newName.trim() || pricesPayload(newPrices).length === 0} onClick={createPackage}>
          {creating ? "…" : "Ստեղծել"}
        </Button>
      </Card>

      {packages.map((pkg) => {
        const isEditing = editingId === pkg.id;
        return (
          <Card key={pkg.id} className="mb-3">
            {!isEditing ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[14.5px] font-bold text-ink">
                      {pkg.name} <span className="font-normal text-muted">({pkg.key})</span>
                    </div>
                    {pkg.description && <div className="text-[12.5px] text-muted">{pkg.description}</div>}
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[12.5px] text-ink">
                      {pkg.prices.map((p) => (
                        <span key={p.id} className="rounded-full border border-line px-2 py-0.5">
                          {BILLING_CYCLE_LABELS[p.billingCycle]}՝ {fmtAmd(p.amountAmd)}
                        </span>
                      ))}
                    </div>
                    {!pkg.isActive && <div className="mt-1 text-[11.5px] font-semibold text-[#841320]">Ապաակտիվացված է</div>}
                  </div>
                  <button onClick={() => startEdit(pkg)} className="flex items-center gap-1 text-[12.5px] font-semibold text-seal">
                    <Pencil size={13} />
                    Խմբագրել
                  </button>
                </div>
              </>
            ) : (
              editDraft && (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                    />
                    <input
                      value={editDraft.description}
                      onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                      placeholder="Նկարագրություն"
                      className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {BILLING_CYCLES.map((c) => (
                      <input
                        key={c}
                        type="number"
                        min={0}
                        value={editDraft.prices[c]}
                        onChange={(e) => setEditDraft({ ...editDraft, prices: { ...editDraft.prices, [c]: e.target.value } })}
                        placeholder={`${BILLING_CYCLE_LABELS[c]} գին (֏)`}
                        className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
                      />
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink">
                    <input type="checkbox" checked={editDraft.isActive} onChange={(e) => setEditDraft({ ...editDraft, isActive: e.target.checked })} />
                    Ակտիվ (տեսանելի է գործընկերներին)
                  </label>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Button disabled={saving} onClick={() => saveEdit(pkg.id)}>
                      <Save size={13} />
                      Պահպանել
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      <X size={13} />
                      Չեղարկել
                    </Button>
                  </div>
                </>
              )
            )}
          </Card>
        );
      })}
    </>
  );
}
