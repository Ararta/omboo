import type { CSSProperties, ReactNode } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,42,74,0.04),0_10px_28px_-18px_rgba(27,42,74,0.18)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
