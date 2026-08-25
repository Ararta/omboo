import { Injectable } from "@nestjs/common";
import type { Prisma, Role } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";

type Tx = Prisma.TransactionClient;

/** Resolves the prototype's string-matched `audience` ("director" | "hr" | "employee:e1")
 * to real `User` rows and writes `Notification` records. Always called with the same `tx`
 * a mutating service method is using, so a notification never gets written for a change
 * that ultimately rolls back. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyRole(tx: Tx, role: Role, text: string, relatedRequestId: string | null = null): Promise<void> {
    const users = await tx.user.findMany({ where: { role }, select: { id: true } });
    if (users.length === 0) return;
    await tx.notification.createMany({
      data: users.map((u) => ({ userId: u.id, text, relatedRequestId })),
    });
  }

  async notifyEmployee(tx: Tx, employeeId: string, text: string, relatedRequestId: string | null = null): Promise<void> {
    const user = await tx.user.findUnique({ where: { employeeId } });
    if (!user) return;
    await tx.notification.create({ data: { userId: user.id, text, relatedRequestId } });
  }

  async listForUser(userId: string) {
    return this.prisma.client.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.client.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}
