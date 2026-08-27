"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ROLE_HOME } from "../../lib/jwt";
import { extractOrgSlugFromHost } from "../../lib/subdomain";
import type { Role } from "@omboo/shared";

type Step =
  | { kind: "password" }
  | { kind: "totp-setup"; setupToken: string; qrCodeDataUrl: string; secret: string }
  | { kind: "totp-challenge"; challengeToken: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    setOrgSlug(extractOrgSlugFromHost(window.location.host));
  }, []);

  function finishLogin(data: { user: { role: string } }) {
    const next = params.get("next");
    router.push(next || ROLE_HOME[data.user.role as Role]);
    router.refresh();
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Մուտքը ձախողվեց։");
        return;
      }
      if (data.totpSetupRequired) {
        setStep({ kind: "totp-setup", setupToken: data.setupToken, qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret });
        return;
      }
      if (data.requiresTotp) {
        setStep({ kind: "totp-challenge", challengeToken: data.challengeToken });
        return;
      }
      finishLogin(data);
    } finally {
      setLoading(false);
    }
  }

  async function submitTotp(e: FormEvent) {
    e.preventDefault();
    if (step.kind === "password") return;
    setError("");
    setLoading(true);
    try {
      const isSetup = step.kind === "totp-setup";
      const res = await fetch(isSetup ? "/api/auth/totp-setup" : "/api/auth/totp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSetup && step.kind === "totp-setup"
            ? { setupToken: step.setupToken, code }
            : step.kind === "totp-challenge"
              ? { challengeToken: step.challengeToken, code }
              : {},
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Սխալ կոդ։");
        return;
      }
      finishLogin(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-8">
        <div className="mb-1 text-[11px] uppercase tracking-widest text-muted">Omboo · ՄՌԿ Թվային Հարթակ</div>

        {step.kind === "password" && (
          <>
            <div className="mb-1 font-serif text-2xl font-bold text-ink">Մուտք</div>
            {orgSlug && <div className="mb-5 text-[12.5px] text-muted">Կազմակերպություն՝ {orgSlug}</div>}
            {!orgSlug && <div className="mb-5" />}
            <form onSubmit={submitPassword} className="flex flex-col gap-3">
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
            <div className="mt-6 flex flex-col gap-2 text-[11px] text-muted">
              <div>Ցուցադրական մուտքեր (գաղտնաբառ՝ omboo1234)՝ ani.hakobyan@example.am, director@company.am, hr@company.am</div>
              <Link href="/register" className="font-semibold text-seal underline">
                Խնդրե՞լ մուտքի իրավունք ՄՌԿ մասնագետի համար
              </Link>
              <Link href="/register-organization" className="font-semibold text-seal underline">
                Նոր կազմակերպությո՞ւն եք ուզում գրանցել
              </Link>
            </div>
          </>
        )}

        {step.kind === "totp-setup" && (
          <>
            <div className="mb-2 font-serif text-2xl font-bold text-ink">Երկքայլ հաստատում</div>
            <p className="mb-4 text-[12.5px] text-muted">
              Backend մուտքի համար պահանջվում է հաստատող հավելված (Google Authenticator, Authy և նման)։ Սկանավորեք կոդը կամ մուտքագրեք
              բանալին ձեռքով, ապա գրեք ստացված 6-նիշանոց կոդը։
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qrCodeDataUrl} alt="QR կոդ" className="mx-auto mb-3 h-40 w-40 rounded-md border border-line" />
            <div className="mb-4 rounded-md bg-paper px-2.5 py-2 text-center font-mono text-[12px] text-ink">{step.secret}</div>
            <form onSubmit={submitTotp} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">6-նիշանոց կոդ</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-center text-lg tracking-[0.4em]"
                />
              </div>
              {error && <div className="text-[12.5px] text-[#841320]">{error}</div>}
              <button
                disabled={loading}
                type="submit"
                className="mt-2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "…" : "Ակտիվացնել և մուտք գործել"}
              </button>
            </form>
          </>
        )}

        {step.kind === "totp-challenge" && (
          <>
            <div className="mb-2 font-serif text-2xl font-bold text-ink">Երկքայլ հաստատում</div>
            <p className="mb-4 text-[12.5px] text-muted">Մուտքագրեք ձեր հաստատող հավելվածի 6-նիշանոց կոդը։</p>
            <form onSubmit={submitTotp} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] text-muted">6-նիշանոց կոդ</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-center text-lg tracking-[0.4em]"
                />
              </div>
              {error && <div className="text-[12.5px] text-[#841320]">{error}</div>}
              <button
                disabled={loading}
                type="submit"
                className="mt-2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "…" : "Հաստատել"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-[11px] text-muted">
          <Link href="/privacy" className="underline">
            Գաղտնիության քաղաքականություն
          </Link>
        </div>
      </div>
    </div>
  );
}
