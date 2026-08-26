import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger" | "seal";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white border border-ink",
  ghost: "bg-transparent text-ink border border-line",
  danger: "bg-white text-[#841320] border border-[#E4D5D1]",
  seal: "bg-seal text-white border border-seal",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-opacity ${VARIANTS[variant]} ${
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
