"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RegisterOrganizationPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName, orgSlug, directorName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Հայտը ձախողվեց։");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-8 text-center">
          <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · ՄՌԿ Թվային Հարթակ</div>
          <div className="mb-3 font-serif text-2xl font-bold text-ink">Կազմակերպությունը ստեղծված է</div>
          <p className="mb-6 text-sm text-muted">
            Այժմ կարող եք մուտք գործել որպես տնoրեն ձեր էլ. փոստով և գաղտնաբառով։
          </p>
          <Link href="/login" className="text-sm font-semibold text-seal underline">
            Մուտք գործել
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-8">
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · ՄՌԿ Թվային Հարթակ</div>
        <div className="mb-1 font-serif text-2xl font-bold text-ink">Նոր կազմակերպություն</div>
        <p className="mb-6 text-[12.5px] text-muted">
          Գրանցեք ձեր կազմակերպությունը Omboo-ում։ Ձեր տվյալները մեկուսացված են այլ կազմակերպություններից։
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Կազմակերպության անվանում</label>
            <input
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Հասցե (slug)</label>
            <input
              required
              placeholder="oրինակ՝ ararta"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted">Կդառնա ձեր հասցեն Omboo-ում (օր.՝ ararta.omboo.am)։</p>
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Ձեր անուն ազգանունը (տնoրեն)</label>
            <input
              required
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Էլ. փոստ</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Գաղտնաբառ (առնվազն 8 նիշ)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="text-[12.5px] text-[#841320]">{error}</div>}
          <button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "…" : "Ստեղծել կազմակերպությունը"}
          </button>
        </form>
        <div className="mt-6 text-center text-[12.5px]">
          <Link href="/login" className="text-seal underline">
            Արդեն հաշիվ ունե՞ք — մուտք գործեք
          </Link>
        </div>
      </div>
    </div>
  );
}
