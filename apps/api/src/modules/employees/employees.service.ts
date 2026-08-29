import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Prisma, getOrgId } from "@omboo/database";
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
    // `Employee.email` is @unique, so employees without a real email each need a distinct
    // placeholder — a shared literal like "—" would collide on the second such employee.
    const employeeEmail = email || `no-email-${randomBytes(4).toString("hex")}@omboo.local`;

    const organizationId = getOrgId();
    let employee;
    try {
      // No nested $transaction — this route already runs inside the per-request transaction
      // (see TenantTransactionInterceptor), so these three writes are already atomic together.
      const tx = this.prisma.client;
      const created = await tx.employee.create({
        data: {
          organizationId,
          name: dto.name,
          position: dto.position,
          email: employeeEmail,
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
          data: { organizationId, email, passwordHash, role: "EMPLOYEE", employeeId: created.id },
        });
      }
      await tx.balanceAdjustmentLog.create({
        data: {
          organizationId,
          employeeId: created.id,
          field: "balance",
          previousValue: 0,
          nextValue: annualTotal,
          changedByUserId: "system",
        },
      });
      employee = created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const owner = await this.prisma.client.employee.findFirst({ where: { email }, select: { name: true, position: true } });
        throw new ConflictException(
          owner
            ? `Այս էլ. փոստն արդեն կապված է ${owner.name}-ի (${owner.position}) հաշվին։`
            : "Այս էլ. փոստով հաշիվ արդեն գոյություն ունի համակարգում։",
        );
      }
      throw e;
    }

    return { employee, temporaryPassword };
  }

  async update(id: string, dto: UpdateEmployeeInput, changedByUserId: string) {
    const existing = await this.findByIdOrThrow(id);
    const minimumDays = dto.minimumDays ?? existing.minimumDays;
    const extendedDays = dto.extendedDays ?? existing.extendedDays;
    const additionalDays = dto.additionalDays ?? existing.additionalDays;
    const annualTotal = minimumDays + extendedDays + additionalDays;
    // Entitlement (annualTotal) and the employee's currently usable balance are separate
    // fields — balance already reflects days used this year, so a change to entitlement must
    // shift balance by the same delta rather than resetting it, or previously-used days would
    // be silently un-used (or over-used days silently forgiven).
    const balanceDelta = annualTotal - existing.annualTotal;
    const nextBalance = existing.balance + balanceDelta;

    if (dto.managerId !== undefined && dto.managerId !== null) {
      if (dto.managerId === id) throw new BadRequestException("Աշխատողը չի կարող ինքն իր ղեկավարը լինել։");
      await this.assertNoManagerCycle(id, dto.managerId);
    }

    const tx = this.prisma.client;
    const updated = await tx.employee.update({
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
        managerId: dto.managerId,
        minimumDays,
        extendedDays,
        additionalDays,
        annualTotal,
        balance: nextBalance,
      },
    });

    if (balanceDelta !== 0) {
      await tx.balanceAdjustmentLog.create({
        data: {
          organizationId: getOrgId(),
          employeeId: id,
          field: "balance",
          previousValue: existing.balance,
          nextValue: nextBalance,
          changedByUserId,
        },
      });
    }

    return updated;
  }

  /** Walks up from `newManagerId` through the manager chain — if `employeeId` appears, setting
   * this manager would create a cycle (eg. A -> B -> A). Postgres has no native way to forbid
   * this on a self-referencing FK, so it's enforced here. */
  private async assertNoManagerCycle(employeeId: string, newManagerId: string): Promise<void> {
    let cursor: string | null = newManagerId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === employeeId) throw new BadRequestException("Այս նշանակումը կստեղծի ղեկավարման ցիկլ։");
      if (seen.has(cursor)) break; // pre-existing cycle elsewhere; don't loop forever
      seen.add(cursor);
      const manager: { managerId: string | null } | null = await this.prisma.client.employee.findUnique({
        where: { id: cursor },
        select: { managerId: true },
      });
      cursor = manager?.managerId ?? null;
    }
  }

  async adjustBalance(id: string, nextBalance: number, changedByUserId: string) {
    const employee = await this.findByIdOrThrow(id);
    const previous = employee.balance;
    const tx = this.prisma.client;
    await tx.employee.update({ where: { id }, data: { balance: nextBalance } });
    await tx.balanceAdjustmentLog.create({
      data: { organizationId: getOrgId(), employeeId: id, field: "balance", previousValue: previous, nextValue: nextBalance, changedByUserId },
    });
    await this.notificationsService.notifyEmployee(tx, id, notifications.balanceManuallyAdjusted(nextBalance));
    return this.findByIdOrThrow(id);
  }
}
