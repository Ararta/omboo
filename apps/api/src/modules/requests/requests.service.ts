import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  addDaysISO,
  fmtDateHY,
  historySteps,
  notifications,
  REQUEST_TYPE_LABELS,
  todayInYerevan,
  validateSubmitRequest,
  type CreateRequestInput,
  type DirectorDecisionInput,
  type HrScheduleVacationInput,
} from "@omboo/shared";
import { getOrgId } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DomainValidationError } from "../../common/errors/domain-validation.error";
import { toEmployeeRuleContext, toISODate, toRequestRuleContext } from "./request-mappers";

const DIRECTOR_ACTOR = "Տնօրեն";
const HR_ACTOR = "ՄՌԿ մասնագետ";

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listMine(employeeId: string) {
    return this.prisma.client.request.findMany({
      where: { employeeId },
      include: { history: { orderBy: { createdAt: "asc" } }, recall: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listAll() {
    return this.prisma.client.request.findMany({
      include: { history: { orderBy: { createdAt: "asc" } }, recall: true, employee: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listPendingForDirector() {
    return this.prisma.client.request.findMany({
      where: { status: "SUBMITTED" },
      include: { employee: true },
      orderBy: { createdAt: "asc" },
    });
  }

  listPendingForHR() {
    return this.prisma.client.request.findMany({
      where: { status: "APPROVED" },
      include: { employee: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Everyone who is approved/order-created and overlapping the current calendar month —
   * mirrors the prototype's `TeamOut`, shown to all three roles. */
  listTeamOutThisMonth() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return this.prisma.client.request.findMany({
      where: {
        status: { in: ["APPROVED", "ORDER_CREATED"] },
        start: { lte: monthEnd },
        end: { gte: monthStart },
      },
      include: { employee: true },
    });
  }

  async submit(employeeId: string, dto: CreateRequestInput) {
    const employee = await this.prisma.client.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const existing = await this.prisma.client.request.findMany({ where: { employeeId } });
    const today = todayInYerevan();

    const result = validateSubmitRequest(dto, toEmployeeRuleContext(employee), existing.map(toRequestRuleContext), today);
    if (!result.ok) throw new DomainValidationError(result.code, result.message);

    const organizationId = getOrgId();
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          organizationId,
          employeeId,
          type: dto.type,
          start: new Date(dto.start),
          end: new Date(dto.end),
          days: result.days,
          reason: dto.reason,
          status: "SUBMITTED",
        },
      });
      await tx.requestHistory.create({
        data: {
          organizationId,
          requestId: request.id,
          step: historySteps.submitted,
          actorUserId: null,
          actorDisplayName: employee.name,
          note: dto.reason,
        },
      });
      if (dto.type === "VACATION") {
        await tx.employee.update({
          where: { id: employeeId },
          data: { lastVacationRequestDate: new Date(today), lastReminderFired: null },
        });
      }
      await this.notificationsService.notifyRole(
        tx,
        "DIRECTOR",
        notifications.newRequestForDirector(employee.name, REQUEST_TYPE_LABELS[dto.type], result.days),
        request.id,
      );
      return request;
    });
  }

  async cancel(employeeId: string, requestId: string) {
    const request = await this.prisma.client.request.findUnique({ where: { id: requestId } });
    if (!request || request.employeeId !== employeeId) throw new NotFoundException("Հայտ-դիմումը չի գտնվել։");
    if (request.status !== "SUBMITTED") {
      throw new ForbiddenException("Միայն սպասման մեջ գտնվող հայտ-դիմումը կարելի է հետ կանչել։");
    }
    const employee = await this.prisma.client.employee.findUniqueOrThrow({ where: { id: employeeId } });

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.request.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
      await tx.requestHistory.create({
        data: {
          organizationId: getOrgId(),
          requestId,
          step: historySteps.cancelledByEmployee,
          actorUserId: null,
          actorDisplayName: employee.name,
        },
      });
      return updated;
    });
  }

  async decide(requestId: string, dto: DirectorDecisionInput) {
    const request = await this.prisma.client.request.findUnique({ where: { id: requestId }, include: { employee: true } });
    if (!request) throw new NotFoundException("Հայտ-դիմումը չի գտնվել։");
    if (request.status !== "SUBMITTED") throw new ForbiddenException("Այս հայտ-դիմումն արդեն որոշում ունի։");

    const step = dto.decision === "APPROVED" ? historySteps.approvedByDirector : historySteps.rejectedByDirector;

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.request.update({ where: { id: requestId }, data: { status: dto.decision } });
      await tx.requestHistory.create({
        data: {
          organizationId: getOrgId(),
          requestId,
          step,
          actorUserId: null,
          actorDisplayName: DIRECTOR_ACTOR,
          note: dto.note,
        },
      });

      if (dto.decision === "APPROVED") {
        if (request.type === "VACATION") {
          const nextBalance = Math.max(0, request.employee.balance - request.days);
          await tx.employee.update({ where: { id: request.employeeId }, data: { balance: nextBalance } });
        } else if (request.type === "DAYOFF") {
          const nextDayOff = Math.max(0, request.employee.dayOffBalance - request.days);
          await tx.employee.update({ where: { id: request.employeeId }, data: { dayOffBalance: nextDayOff } });
        }
      }

      const startHY = fmtDateHY(toISODate(request.start));
      const endHY = fmtDateHY(toISODate(request.end));
      const employeeText =
        dto.decision === "APPROVED"
          ? notifications.approvedForEmployee(startHY, endHY)
          : notifications.rejectedForEmployee(startHY, endHY, dto.note ?? "");
      await this.notificationsService.notifyEmployee(tx, request.employeeId, employeeText, requestId);

      if (dto.decision === "APPROVED") {
        await this.notificationsService.notifyRole(tx, "HR", notifications.orderPendingForHR(request.employee.name), requestId);
      }

      return updated;
    });
  }

  /** հոդված 164.10 HR override: schedules (auto-approves) vacation directly, without an
   * employee-submitted request. Always a human-clicked action — never called by the
   * reminder cron itself (see reminders.service.ts). */
  async hrScheduleVacation(dto: HrScheduleVacationInput) {
    const employee = await this.prisma.client.employee.findUniqueOrThrow({ where: { id: dto.employeeId } });
    const end = addDaysISO(dto.start, Math.max(0, dto.days - 1));
    const today = todayInYerevan();

    const organizationId = getOrgId();
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          type: "VACATION",
          start: new Date(dto.start),
          end: new Date(end),
          days: dto.days,
          status: "APPROVED",
        },
      });
      await tx.requestHistory.create({
        data: {
          organizationId,
          requestId: request.id,
          step: historySteps.hrScheduled,
          actorUserId: null,
          actorDisplayName: HR_ACTOR,
        },
      });
      const nextBalance = Math.max(0, employee.balance - dto.days);
      await tx.employee.update({
        where: { id: dto.employeeId },
        data: { balance: nextBalance, lastVacationRequestDate: new Date(today), lastReminderFired: null },
      });
      await this.notificationsService.notifyEmployee(
        tx,
        dto.employeeId,
        notifications.hrScheduledForEmployee(fmtDateHY(dto.start), dto.days),
        request.id,
      );
      await this.notificationsService.notifyRole(tx, "HR", notifications.hrScheduledForHR(employee.name), request.id);
      return request;
    });
  }
}
