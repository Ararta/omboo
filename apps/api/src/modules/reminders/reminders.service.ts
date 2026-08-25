import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { getReminderInfo, notifications, shouldFireReminder, todayInYerevan } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { toISODate } from "../requests/request-mappers";

/** հոդված 164.10 — nightly sweep for employees who haven't submitted a vacation request in
 * ~2.5 years. Notifies HR and the employee; NEVER creates a request or touches a balance —
 * the actual override that schedules leave is a normal human-clicked HR endpoint
 * (RequestsService.hrScheduleVacation), preserving the հոդված 131-136 no-fully-automated-
 * decision requirement. */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron("0 6 * * *", { timeZone: "Asia/Yerevan" })
  async dailyReminderSweep(): Promise<void> {
    const today = todayInYerevan();
    const employees = await this.prisma.client.employee.findMany();
    let fired = 0;

    for (const emp of employees) {
      const last = emp.lastVacationRequestDate ? toISODate(emp.lastVacationRequestDate) : null;
      const { daysRemaining } = getReminderInfo(last, toISODate(emp.hireDate), today);
      if (!shouldFireReminder(daysRemaining, emp.lastReminderFired)) continue;

      await this.prisma.client.$transaction(async (tx) => {
        await this.notificationsService.notifyRole(tx, "HR", notifications.reminderForHR(emp.name, daysRemaining));
        await this.notificationsService.notifyEmployee(tx, emp.id, notifications.reminderForEmployee(daysRemaining));
        await tx.employee.update({ where: { id: emp.id }, data: { lastReminderFired: daysRemaining } });
      });
      fired++;
    }

    if (fired > 0) this.logger.log(`164.10 reminder sweep: fired ${fired} reminder(s).`);
  }
}
