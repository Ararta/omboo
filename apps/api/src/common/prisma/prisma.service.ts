import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma, PrismaClient } from "@omboo/database";

/** Thin Nest-lifecycle wrapper around the shared `@omboo/database` Prisma singleton. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
