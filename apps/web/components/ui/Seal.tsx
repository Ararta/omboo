export function Seal({ label, sub, tone = "seal" }: { label: string | number; sub: string; tone?: "seal" | "ink" }) {
  const toneClass = tone === "ink" ? "border-ink text-ink" : "border-seal text-seal";
  return (
    <div
      className={`flex h-[108px] w-[108px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed ${toneClass}`}
      style={{ transform: "rotate(-6deg)" }}
    >
      <div className="font-serif text-[26px] font-bold leading-none">{label}</div>
      <div className="mt-1 font-serif text-[10px] uppercase tracking-wide">{sub}</div>
    </div>
  );
}
