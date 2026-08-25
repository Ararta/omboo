import { OrgSettingsSection } from "../../components/hr/OrgSettingsSection";
import { EmployeesSection } from "../../components/hr/EmployeesSection";
import { ReminderSection } from "../../components/hr/ReminderSection";
import { OrdersSection } from "../../components/hr/OrdersSection";
import { RecallsSection } from "../../components/hr/RecallsSection";
import { AuditSection } from "../../components/hr/AuditSection";

export default function HrPage() {
  return (
    <div>
      <OrgSettingsSection />
      <EmployeesSection />
      <ReminderSection />
      <OrdersSection />
      <RecallsSection />
      <AuditSection />
    </div>
  );
}
