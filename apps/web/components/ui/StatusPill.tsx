import type { RequestStatus } from "@omboo/shared";

const STATUS_MAP: Record<RequestStatus, { text: string; bg: string; fg: string }> = {
  SUBMITTED: { text: "Ուղարկված է", bg: "#F3EAE6", fg: "#241619" },
  APPROVED: { text: "Հաստատված է", bg: "#E6F4EC", fg: "#1F7A4D" },
  REJECTED: { text: "Մերժված է", bg: "#F5E1E0", fg: "#841320" },
  CANCELLED: { text: "Հետ կանչված է", bg: "#F5E1E0", fg: "#841320" },
  ORDER_CREATED: { text: "Հրամանը կազմված է", bg: "#F7EED0", fg: "#A9860F" },
};

export const STATUS_LABELS: Record<RequestStatus, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [k, v.text]),
) as Record<RequestStatus, string>;

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.text}
    </span>
  );
}
