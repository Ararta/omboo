// Deliberately a pure passthrough — /partner/login and /partner/register (nested in this same
// route subtree, for a clean URL namespace) render their own full-screen centered forms and
// must NOT get the dashboard's padding/max-width/header; those live in PartnerDashboard itself
// (rendered only by app/partner/page.tsx), not here.
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
