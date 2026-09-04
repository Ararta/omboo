"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircle, CheckCircle2 } from "lucide-react";
import { BILLING_CYCLE_LABELS, type BillingCycle } from "@omboo/shared";
import { partnerApi, PartnerApiError } from "../../lib/partner-api-client";
import type { PackageView, OrderView, InvoiceView } from "../../lib/types";
import { fmtAmd } from "../../lib/partner-format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const EMPTY = {
  packageId: "",
  billingCycle: "" as BillingCycle | "",
  contractYear: 1,
  customerCompanyName: "",
  customerContactName: "",
  customerEmail: "",
  customerPhone: "",
  notes: "",
};

export function NewDealSection() {
  const [packages, setPackages] = useState<PackageView[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ order: OrderView; invoice: InvoiceView } | null>(null);

  useEffect(() => {
    partnerApi.get<PackageView[]>("/deals/packages").then(setPackages);
  }, []);

  const selectedPackage = useMemo(() => packages.find((p) => p.id === form.packageId), [packages, form.packageId]);
  const selectedPrice = useMemo(
    () => selectedPackage?.prices.find((p) => p.billingCycle === form.billingCycle),
    [selectedPackage, form.billingCycle],
  );

  function pickPackage(packageId: string) {
    const pkg = packages.find((p) => p.id === packageId);
    setForm({ ...form, packageId, billingCycle: pkg?.prices[0]?.billingCycle ?? "" });
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm({ ...form, [key]: value });
  }

  const canSubmit =
    form.packageId && form.billingCycle && form.customerCompanyName.trim() && form.customerContactName.trim() && form.customerEmail.trim() && form.customerPhone.trim();

  async function submit() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await partnerApi.post<{ order: OrderView; invoice: InvoiceView }>("/deals", {
        ...form,
        contractYear: form.contractYear,
      });
      setResult(res);
      setForm(EMPTY);
    } catch (e) {
      setError(e instanceof PartnerApiError ? e.message : "Սխալ տեղի ունեցավ։");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <>
        <div className="my-6 font-serif text-[17px] text-ink">Նոր գործարք</div>
        <Card className="border-[#BFE0CC] bg-[#F3FAF5]">
          <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-[#1E6B3C]">
            <CheckCircle2 size={16} />
            Գործարքը ստեղծված է
          </div>
          <div className="text-[13px] text-ink">
            Հաշիվ-ապրանքագիր № {result.invoice.invoiceNumber} ուղարկվել է {result.order.customerEmail} հասցեին։
          </div>
          <div className="mt-1.5 text-[13px] text-muted">
            {result.order.package.name} · {fmtAmd(result.order.priceAmountAmd)} · Ձեր կոմիսիան՝ {fmtAmd(result.order.commissionAmountAmd)} (
            {result.order.commissionRatePercent}%)
          </div>
          <Button className="mt-3.5" onClick={() => setResult(null)}>
            <PlusCircle size={14} />
            Նոր գործարք ստեղծել
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Նոր գործարք</div>
      <Card>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-seal">Փաթեթ և ցիկլ</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={form.packageId} onChange={(e) => pickPackage(e.target.value)} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm">
            <option value="">Ընտրեք փաթեթը</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={form.billingCycle}
            onChange={(e) => update("billingCycle", e.target.value as BillingCycle)}
            disabled={!selectedPackage}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Ընտրեք ցիկլը</option>
            {selectedPackage?.prices.map((p) => (
              <option key={p.billingCycle} value={p.billingCycle}>
                {BILLING_CYCLE_LABELS[p.billingCycle]} — {fmtAmd(p.amountAmd)}
              </option>
            ))}
          </select>
          <div>
            <input
              type="number"
              min={1}
              value={form.contractYear}
              onChange={(e) => update("contractYear", Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
              placeholder="Պայմանագրի տարի"
            />
            <div className="mt-0.5 text-[11px] text-muted">Հաճախորդի պայմանագրի հերթական տարին (1 = առաջին)</div>
          </div>
        </div>
        {selectedPrice && <div className="mt-2.5 text-[13px] text-ink">Գին՝ {fmtAmd(selectedPrice.amountAmd)}</div>}

        <div className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-wider text-seal">Պատվիրատու կազմակերպության տվյալներ</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={form.customerCompanyName}
            onChange={(e) => update("customerCompanyName", e.target.value)}
            placeholder="Կազմակերպության անվանում"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            value={form.customerContactName}
            onChange={(e) => update("customerContactName", e.target.value)}
            placeholder="Կոնտակտային անձի անուն"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            type="email"
            value={form.customerEmail}
            onChange={(e) => update("customerEmail", e.target.value)}
            placeholder="Էլ. փոստ (հաշիվն ուղարկվելու է այս հասցեին)"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
          <input
            value={form.customerPhone}
            onChange={(e) => update("customerPhone", e.target.value)}
            placeholder="Հեռախոս"
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
          />
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Նշումներ (ըստ ցանկության)"
          rows={2}
          className="mt-2 w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
        />

        {error && <div className="mt-2.5 text-[12.5px] text-[#841320]">{error}</div>}
        <Button className="mt-3.5" disabled={!canSubmit || submitting} onClick={submit}>
          {submitting ? "…" : "Ստեղծել գործարքը և ուղարկել կանխավճարի հաշիվը"}
        </Button>
      </Card>
    </>
  );
}
