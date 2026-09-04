"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PARTNER_HOME } from "../../../lib/partner-jwt";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/partner-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Մուտքը ձախողվեց։");
        return;
      }
      router.push(PARTNER_HOME);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-8">
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · Գործընկերների հարթակ</div>
        <div className="mb-5 font-serif text-2xl font-bold text-ink">Մուտք</div>
        <form onSubmit={submit} className="flex flex-col gap-3">
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
            <label className="mb-1 block text-[11.5px] text-muted">Գաղտնաբառ</label>
            <input
              type="password"
              required
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
            {loading ? "…" : "Մուտք գործել"}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-2 text-center text-[12.5px]">
          <Link href="/partner/register" className="font-semibold text-seal underline">
            Նոր գործընկե՞ր եք — գրանցվեք
          </Link>
        </div>
      </div>
    </div>
  );
}
