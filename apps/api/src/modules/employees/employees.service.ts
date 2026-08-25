import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@omboo/shared";
import { notifications } from "@omboo/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.client.employee.findMany({ orderBy: { name: "asc" } });
  }

  async findByIdOrThrow(id: string) {
    const employee = await this.prisma.client.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException("Աշխատողը չի գտնվել։");
    return employee;
  }

  /** Creates the Employee and, if an email was given, a matching EMPLOYEE login with a
   * random temporary password — returned once so HR can hand it to the new hire. There is
   * no invite/reset-password email flow yet (explicit Phase 1 follow-up, see plan). */
  async create(dto: CreateEmployeeInput) {
    const annualTotal = dto.minimumDays + dto.extendedDays + dto.additionalDays;
    const email = dto.email || "";
    const temporaryPassword = email ? randomBytes(6).toString("base64url") : null;
    const passwordHash = temporaryPassword ? await bcrypt.hash(temporaryPassword, 10) : null;

    const employee = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          name: dto.name,
          position: dto.position,
          email: email || "—",
          hireDate: new Date(dto.hireDate),
          minimumDays: dto.minimumDays,
          extendedDays: dto.extendedDays,
          additionalDays: dto.additionalDays,
          annualTotal,
          balance: annualTotal,
          dayOffBalance: 5,
          lastVacationRequestDate: new Date(dto.hireDate),
        },
      });
      if (email && passwordHash) {
        await tx.user.create({
          data: { email, passwordHash, role: "EMPLOYEE", employeeId: created.id },
        });
      }
      await tx.balanceAdjustmentLog.create({
        data: {
          employeeId: created.id,
          field: "balance",
          previousValue: 0,
          nextValue: annualTotal,
          changedByUserId: "system",
        },
      });
      return created;
    });

    return { employee, temporaryPassword };
  }

  async update(id: string, dto: UpdateEmployeeInput) {
    const existing = await this.findByIdOrThrow(id);
    const minimumDays = dto.minimumDays ?? existing.minimumDays;
    const extendedDays = dto.extendedDays ?? existing.extendedDays;
    const additionalDays = dto.additionalDays ?? existing.additionalDays;
    const annualTotal = minimumDays + extendedDays + additionalDays;

    return this.prisma.client.employee.update({
      where: { id },
      data: {
        name: dto.name,
        position: dto.position,
        email: dto.email,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        dayOffBalance: dto.dayOffBalance,
        tenDayChunkConfirmed: dto.tenDayChunkConfirmed,
        priorityUnder18: dto.priorityUnder18,
        priorityParentOrPregnant: dto.priorityParentOrPregnant,
        priorityTeacher: dto.priorityTeacher,
        priorityCaregiver: dto.priorityCaregiver,
        priorityViolenceVictim: dto.priorityViolenceVictim,
        minimumDays,
        extendedDays,
        additionalDays,
        annualTotal,
      },
    });
  }

  async adjustBalance(id: string, nextBalance: number, changedByUserId: string) {
    const employee = await this.findByIdOrThrow(id);
    const previous = employee.balance;
    await this.prisma.client.$transaction(async (tx) => {
      await tx.employee.update({ where: { id }, data: { balance: nextBalance } });
      await tx.balanceAdjustmentLog.create({
        data: { employeeId: id, field: "balance", previousValue: previous, nextValue: nextBalance, changedByUserId },
      });
      await this.notificationsService.notifyEmployee(tx, id, notifications.balanceManuallyAdjusted(nextBalance));
    });
    return this.findByIdOrThrow(id);
  }
}
