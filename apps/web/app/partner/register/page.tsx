"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function PartnerRegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/partner-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactName, email, phone, password }),
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
          <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · Գործընկերների հարթակ</div>
          <div className="mb-3 font-serif text-2xl font-bold text-ink">Գրանցումը հաստատված է</div>
          <p className="mb-6 text-sm text-muted">Ձեր հաշիվն արդեն ակտիվ է։ Մուտք գործեք Ձեր էլ. փոստով և գաղտնաբառով։</p>
          <Link href="/partner/login" className="text-sm font-semibold text-seal underline">
            Մուտք գործել
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-8">
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · Գործընկերների հարթակ</div>
        <div className="mb-1 font-serif text-2xl font-bold text-ink">Գործընկերոջ գրանցում</div>
        <p className="mb-6 text-[12.5px] text-muted">
          Գրանցվեք Omboo B2B գործընկերային ծրագրում՝ վաճառքներ իրականացնելու և կոմիսիա վաստակելու համար։
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Կազմակերպության անվանում</label>
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-muted">Կոնտակտային անձի անուն</label>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
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
            <label className="mb-1 block text-[11.5px] text-muted">Հեռախոս</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            {loading ? "…" : "Գրանցվել"}
          </button>
        </form>
        <div className="mt-6 text-center text-[12.5px]">
          <Link href="/partner/login" className="text-seal underline">
            Արդեն հաշիվ ունե՞ք — մուտք գործեք
          </Link>
        </div>
      </div>
    </div>
  );
}
