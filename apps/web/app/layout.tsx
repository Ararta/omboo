import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omboo — ՄՌԿ Թվային Հարթակ",
  description: "Արձակուրդի/բացակայության հայտ-դիմումների կառավարում",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hy">
      <body>{children}</body>
    </html>
  );
}
