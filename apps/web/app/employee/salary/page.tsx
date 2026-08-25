import { FileText } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export default function SalaryPage() {
  return (
    <Card className="p-10 text-center text-muted">
      <FileText size={22} className="mx-auto mb-2" />
      <div className="mb-1 font-serif text-base text-ink">Աշխատավարձ</div>
      <div className="text-[13px]">Այս բաժինը կավելանա Փուլ 2-ում (աշխատավարձի բացվածք, հաշվարկային թերթիկ)։</div>
    </Card>
  );
}
