import type { RequestStatus } from "@omboo/shared";

const STATUS_MAP: Record<RequestStatus, { text: string; bg: string; fg: string }> = {
  SUBMITTED: { text: "Ուղարկված է", bg: "#EEF0F5", fg: "#1B2A4A" },
  APPROVED: { text: "Հաստատված է", bg: "#E7F3EA", fg: "#1E6B3A" },
  REJECTED: { text: "Մերժված է", bg: "#FBEAEA", fg: "#A02E2E" },
  CANCELLED: { text: "Հետ կանչված է", bg: "#FBEAEA", fg: "#A02E2E" },
  ORDER_CREATED: { text: "Հրամանը կազմված է", bg: "#EFE7F7", fg: "#6B3FA0" },
};

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.text}
    </span>
  );
}
