import type { CSSProperties, ReactNode } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-[10px] border border-line bg-white p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}
