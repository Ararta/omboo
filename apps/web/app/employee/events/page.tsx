import { Users } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export default function EventsPage() {
  return (
    <Card className="p-10 text-center text-muted">
      <Users size={22} className="mx-auto mb-2" />
      <div className="mb-1 font-serif text-base text-ink">Կորպորատիվ միջոցառումներ</div>
      <div className="text-[13px]">Այս բաժինը կավելանա հետագա փուլում (ստեղծագործական համագործակցության մոդուլ)։</div>
    </Card>
  );
}
