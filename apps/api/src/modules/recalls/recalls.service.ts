import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  computeRecallFinalization,
  fmtDateHY,
  formatOrderNumber,
  historySteps,
  isValidRecallRequestedEnd,
  notifications,
  todayInYerevan,
  validationMessages,
  type RecallRequestInput,
} from "@omboo/shared";
import { getOrgId } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DomainValidationError } from "../../common/errors/domain-validation.error";
import { toISODate } from "../requests/request-mappers";

const HR_ACTOR = "ՄՌԿ մասնագետ";

@Injectable()
export class RecallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listRecallable() {
    return this.prisma.client.request.findMany({
      where: { status: "ORDER_CREATED", recall: null, end: { gte: new Date(todayInYerevan()) } },
      include: { employee: true },
    });
  }

  listToFinalize() {
    return this.prisma.client.request.findMany({
      where: { recall: { status: "ACCEPTED" } },
      include: { employee: true, recall: true },
    });
  }

  listPendingForEmployee(employeeId: string) {
    return this.prisma.client.request.findMany({
      where: { employeeId, recall: { status: "PENDING_EMPLOYEE" } },
      include: { recall: true },
    });
  }

  async requestRecall(requestId: string, dto: RecallRequestInput) {
    const request = await this.prisma.client.request.findUnique({
      where: { id: requestId },
      include: { employee: true, recall: true },
    });
    if (!request) throw new NotFoundException("Հայտ-դիմումը չի գտնվել։");
    if (request.status !== "ORDER_CREATED") {
      throw new ForbiddenException("Հետկանչում կարելի է առաջարկել միայն հրամանով ձևակերպված արձակուրդի համար։");
    }
    if (request.recall) throw new ForbiddenException("Այս հայտ-դիմումի համար արդեն կա հետկանչման հայտ։");
    if (!isValidRecallRequestedEnd(toISODate(request.end), dto.requestedEnd)) {
      throw new DomainValidationError("RECALL_END_NOT_BEFORE_ORIGINAL", validationMessages.recallRequestedEndMustPrecedeOriginalEnd);
    }

    const organizationId = getOrgId();
    const tx = this.prisma.client;
    await tx.recall.create({
      data: {
        organizationId,
        requestId,
        requestedEnd: new Date(dto.requestedEnd),
        reason: dto.reason,
        status: "PENDING_EMPLOYEE",
      },
    });
    await tx.requestHistory.create({
      data: {
        organizationId,
        requestId,
        step: historySteps.recallRequested,
        actorUserId: null,
        actorDisplayName: HR_ACTOR,
        note: dto.reason,
      },
    });
    await this.notificationsService.notifyEmployee(
      tx,
      request.employeeId,
      notifications.recallRequestedForEmployee(fmtDateHY(dto.requestedEnd)),
      requestId,
    );
    return tx.recall.findUnique({ where: { requestId } });
  }

  async respond(employeeId: string, requestId: string, accept: boolean) {
    const request = await this.prisma.client.request.findUnique({
      where: { id: requestId },
      include: { recall: true, employee: true },
    });
    if (!request || request.employeeId !== employeeId) throw new NotFoundException("Հայտ-դիմումը չի գտնվել։");
    if (!request.recall || request.recall.status !== "PENDING_EMPLOYEE") {
      throw new ForbiddenException("Հետկանչման հայտ, որին կարելի է պատասխանել, չկա։");
    }

    const status = accept ? "ACCEPTED" : "DECLINED";
    const step = accept ? historySteps.recallAccepted : historySteps.recallDeclined;

    const tx = this.prisma.client;
    await tx.recall.update({ where: { requestId }, data: { status } });
    await tx.requestHistory.create({
      data: { organizationId: getOrgId(), requestId, step, actorUserId: null, actorDisplayName: request.employee.name },
    });
    const text = accept
      ? notifications.recallAcceptedForHR(request.employee.name)
      : notifications.recallDeclinedForHR(request.employee.name);
    await this.notificationsService.notifyRole(tx, "HR", text, requestId);
    return tx.recall.findUnique({ where: { requestId } });
  }

  async finalize(requestId: string) {
    const request = await this.prisma.client.request.findUnique({
      where: { id: requestId },
      include: { recall: true, employee: true },
    });
    if (!request || !request.recall || request.recall.status !== "ACCEPTED") {
      throw new ForbiddenException("Հետկանչման հրաման կարելի է կազմել միայն աշխատողի համաձայնությունից հետո։");
    }

    const { newDays, delta } = computeRecallFinalization(
      { start: toISODate(request.start), end: toISODate(request.end), days: request.days },
      toISODate(request.recall.requestedEnd),
    );
    const year = new Date().getFullYear();
    const requestedEndDate = request.recall.requestedEnd;
    const organizationId = getOrgId();

    const tx = this.prisma.client;
    const seq = await tx.orderSequence.upsert({
      where: { organizationId_year_series: { organizationId, year, series: "RECALL" } },
      update: { lastValue: { increment: 1 } },
      create: { organizationId, year, series: "RECALL", lastValue: 1 },
    });
    const orderNumber = formatOrderNumber(year, "RECALL", seq.lastValue);

    await tx.request.update({ where: { id: requestId }, data: { end: requestedEndDate, days: newDays } });
    await tx.recall.update({ where: { requestId }, data: { status: "FINALIZED", orderNumber } });
    await tx.requestHistory.create({
      data: {
        organizationId,
        requestId,
        step: historySteps.recallOrderCreated(orderNumber),
        actorUserId: null,
        actorDisplayName: HR_ACTOR,
      },
    });

    if (delta > 0) {
      if (request.type === "VACATION") {
        await tx.employee.update({ where: { id: request.employeeId }, data: { balance: { increment: delta } } });
      } else if (request.type === "DAYOFF") {
        await tx.employee.update({ where: { id: request.employeeId }, data: { dayOffBalance: { increment: delta } } });
      }
    }

    await this.notificationsService.notifyEmployee(tx, request.employeeId, notifications.recallFinalizedForEmployee(delta), requestId);
    return tx.request.findUnique({ where: { id: requestId }, include: { recall: true } });
  }
}
