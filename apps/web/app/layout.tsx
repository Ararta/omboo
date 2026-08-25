import type { Metadata } from "next";
import { Noto_Sans_Armenian, Noto_Serif_Armenian } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_Armenian({
  subsets: ["armenian", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Noto_Serif_Armenian({
  subsets: ["armenian", "latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omboo — ՄՌԿ Թվային Հարթակ",
  description: "Արձակուրդի/բացակայության հայտ-դիմումների կառավարում",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hy">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
