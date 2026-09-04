"use client";

import { useEffect, useMemo, useState } from "react";
import { Percent, Save } from "lucide-react";
import { BILLING_CYCLES, BILLING_CYCLE_LABELS, CONTRACT_YEAR_TIERS, CONTRACT_YEAR_TIER_LABELS, type BillingCycle, type ContractYearTier } from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import type { CommissionRateView, PackageView } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type RateGrid = Record<BillingCycle, Record<ContractYearTier, string>>;

function emptyGrid(): RateGrid {
  const grid = {} as RateGrid;
  for (const c of BILLING_CYCLES) {
    grid[c] = {} as Record<ContractYearTier, string>;
    for (const t of CONTRACT_YEAR_TIERS) grid[c][t] = "";
  }
  return grid;
}

export function CommissionRatesSection() {
  const [packages, setPackages] = useState<PackageView[]>([]);
  const [rates, setRates] = useState<CommissionRateView[]>([]);
  const [packageId, setPackageId] = useState("");
  const [grid, setGrid] = useState<RateGrid>(emptyGrid());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    Promise.all([api.get<PackageView[]>("/platform-admin/packages"), api.get<CommissionRateView[]>("/platform-admin/commission-rates")]).then(
      ([pkgs, r]) => {
        setPackages(pkgs);
        setRates(r);
      },
    );
  }

  useEffect(load, []);

  useEffect(() => {
    if (!packageId) {
      setGrid(emptyGrid());
      return;
    }
    const next = emptyGrid();
    for (const r of rates) {
      if (r.packageId !== packageId) continue;
      next[r.billingCycle][r.contractYearTier] = String(r.ratePercent);
    }
    setGrid(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, rates]);

  const ratesByPackage = useMemo(() => {
    const map = new Map<string, CommissionRateView[]>();
    for (const r of rates) {
      if (!map.has(r.packageId)) map.set(r.packageId, []);
      map.get(r.packageId)!.push(r);
    }
    return map;
  }, [rates]);

  async function save() {
    if (!packageId) return;
    const payload = BILLING_CYCLES.flatMap((c) =>
      CONTRACT_YEAR_TIERS.filter((t) => grid[c][t].trim() !== "").map((t) => ({ billingCycle: c, contractYearTier: t, ratePercent: Number(grid[c][t]) })),
    );
    if (payload.length === 0) return;
    setError("");
    setSaving(true);
    try {
      await api.post("/platform-admin/commission-rates", { packageId, rates: payload });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ։");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="my-6 font-serif text-[17px] text-ink">Կոմիսիայի տոկոսադրույքներ</div>
      {error && <div className="mb-2.5 text-[12.5px] text-[#841320]">{error}</div>}

      <Card className="mb-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
          <Percent size={13} />
          Սահմանել տոկոսադրույքներ
        </div>
        <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm sm:w-64">
          <option value="">Ընտրեք փաթեթը</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {packageId && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BILLING_CYCLES.map((c) => (
              <div key={c}>
                <div className="mb-1 text-[12px] font-semibold text-ink">{BILLING_CYCLE_LABELS[c]}</div>
                {CONTRACT_YEAR_TIERS.map((t) => (
                  <div key={t} className="mb-1.5 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={grid[c][t]}
                      onChange={(e) => setGrid({ ...grid, [c]: { ...grid[c], [t]: e.target.value } })}
                      className="w-20 rounded-md border border-line px-2 py-1.5 text-sm"
                    />
                    <span className="text-[11.5px] text-muted">% · {CONTRACT_YEAR_TIER_LABELS[t]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <Button className="mt-2.5" disabled={!packageId || saving} onClick={save}>
          <Save size={13} />
          {saving ? "…" : "Պահպանել"}
        </Button>
      </Card>

      {packages.map((pkg) => {
        const pkgRates = ratesByPackage.get(pkg.id) ?? [];
        if (pkgRates.length === 0) return null;
        return (
          <Card key={pkg.id} className="mb-2.5">
            <div className="text-[13.5px] font-bold text-ink">{pkg.name}</div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[12.5px]">
              {pkgRates.map((r) => (
                <span key={r.id} className="rounded-full border border-line px-2 py-0.5 text-ink">
                  {BILLING_CYCLE_LABELS[r.billingCycle]} · {CONTRACT_YEAR_TIER_LABELS[r.contractYearTier]} · {r.ratePercent}%
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </>
  );
}
