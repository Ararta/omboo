import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { distanceMeters } from "@omboo/shared";
import type { AttendanceManualCreateInput, AttendanceUpdateInput, GpsPointInput } from "@omboo/shared";
import { getOrgId } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws if a geofence is configured and `point` falls outside it. No-op (returns) when
   * HR hasn't set an office location yet — check-in/out is unrestricted until then. */
  private async assertWithinGeofence(point: GpsPointInput): Promise<void> {
    const org = await this.prisma.client.orgSettings.findUnique({ where: { organizationId: getOrgId() } });
    if (org?.officeLat == null || org?.officeLng == null) return;

    const distance = distanceMeters(point, { lat: org.officeLat, lng: org.officeLng });
    if (distance > org.geofenceRadiusMeters) {
      throw new ForbiddenException(
        `Դուք գտնվում եք աշխատավայրից ${Math.round(distance)} մ հեռավորության վրա (թույլատրելի է մինչև ${org.geofenceRadiusMeters} մ)։`,
      );
    }
  }

  async checkIn(employeeId: string, point: GpsPointInput) {
    const open = await this.prisma.client.attendanceLog.findFirst({
      where: { employeeId, checkOutAt: null },
    });
    if (open) throw new ConflictException("Դուք արդեն նշված եք որպես ներկա, նախ նշեք ելքը։");

    await this.assertWithinGeofence(point);
    return this.prisma.client.attendanceLog.create({
      data: {
        employeeId,
        organizationId: getOrgId(),
        checkInAt: new Date(),
        checkInLat: point.lat,
        checkInLng: point.lng,
        checkInWithinGeofence: true,
      },
    });
  }

  async checkOut(employeeId: string, point: GpsPointInput) {
    const open = await this.prisma.client.attendanceLog.findFirst({
      where: { employeeId, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
    });
    if (!open) throw new NotFoundException("Բաց մուտքի գրանցում չի գտնվել, նախ նշեք մուտքը։");

    await this.assertWithinGeofence(point);
    return this.prisma.client.attendanceLog.update({
      where: { id: open.id },
      data: {
        checkOutAt: new Date(),
        checkOutLat: point.lat,
        checkOutLng: point.lng,
        checkOutWithinGeofence: true,
      },
    });
  }

  async status(employeeId: string) {
    const open = await this.prisma.client.attendanceLog.findFirst({
      where: { employeeId, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
    });
    return { checkedIn: !!open, since: open?.checkInAt ?? null };
  }

  listMine(employeeId: string) {
    return this.prisma.client.attendanceLog.findMany({
      where: { employeeId },
      orderBy: { checkInAt: "desc" },
      take: 200,
    });
  }

  /** HR-only. Raw GPS coordinates are included — never send this data on to Director,
   * other employees, exports, or emails. */
  listAll(filter: { employeeId?: string; from?: string; to?: string }) {
    return this.prisma.client.attendanceLog.findMany({
      where: {
        employeeId: filter.employeeId,
        checkInAt: {
          gte: filter.from ? new Date(filter.from) : undefined,
          lte: filter.to ? new Date(filter.to) : undefined,
        },
      },
      include: { employee: { select: { id: true, name: true, position: true } } },
      orderBy: { checkInAt: "desc" },
      take: 500,
    });
  }

  /** Aggregated hours per employee — the only attendance-derived data meant to travel further
   * than HR/the employee themselves (e.g. into payroll discussions); it carries no coordinates. */
  async report(filter: { from?: string; to?: string }) {
    const logs = await this.prisma.client.attendanceLog.findMany({
      where: {
        checkInAt: {
          gte: filter.from ? new Date(filter.from) : undefined,
          lte: filter.to ? new Date(filter.to) : undefined,
        },
        checkOutAt: { not: null },
      },
      include: { employee: { select: { id: true, name: true, position: true } } },
    });

    const byEmployee = new Map<string, { employeeId: string; name: string; position: string; totalHours: number; entryCount: number }>();
    for (const log of logs) {
      const hours = (log.checkOutAt!.getTime() - log.checkInAt.getTime()) / (1000 * 60 * 60);
      const existing = byEmployee.get(log.employeeId);
      if (existing) {
        existing.totalHours += hours;
        existing.entryCount += 1;
      } else {
        byEmployee.set(log.employeeId, {
          employeeId: log.employeeId,
          name: log.employee.name,
          position: log.employee.position,
          totalHours: hours,
          entryCount: 1,
        });
      }
    }
    return [...byEmployee.values()]
      .map((r) => ({ ...r, totalHours: Math.round(r.totalHours * 100) / 100 }))
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  }

  async update(id: string, dto: AttendanceUpdateInput, actorUserId: string) {
    const existing = await this.prisma.client.attendanceLog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Գրանցումը չի գտնվել։");

    return this.prisma.client.attendanceLog.update({
      where: { id },
      data: {
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : undefined,
        checkOutAt: dto.checkOutAt === undefined ? undefined : dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        note: dto.note,
        editedByUserId: actorUserId,
        editedAt: new Date(),
      },
    });
  }

  async createManual(dto: AttendanceManualCreateInput, actorUserId: string) {
    const employee = await this.prisma.client.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException("Աշխատողը չի գտնվել։");

    return this.prisma.client.attendanceLog.create({
      data: {
        employeeId: dto.employeeId,
        organizationId: getOrgId(),
        checkInAt: new Date(dto.checkInAt),
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        note: dto.note,
        editedByUserId: actorUserId,
        editedAt: new Date(),
      },
    });
  }
}
