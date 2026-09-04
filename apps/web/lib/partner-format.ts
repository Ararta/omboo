// Shared by every partner-dashboard section that displays money — AMD has no meaningful
// fractional unit in practice, so this is always a whole-number display, never toFixed(2).
export function fmtAmd(amountAmd: number): string {
  return `${amountAmd.toLocaleString("hy-AM")} ֏`;
}
