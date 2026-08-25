import { AppHeader } from "../../components/AppHeader";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper px-5 py-7">
      <div className="mx-auto max-w-[900px]">
        <AppHeader eyebrow="ՄՌԿ Թվային Հարթակ · Փուլ 1" title="ՄՌԿ կառավարման վահանակ" />
        {children}
      </div>
    </div>
  );
}
