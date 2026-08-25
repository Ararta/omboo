import { PrismaClient } from "@prisma/client";

// Reused across hot-reloads in dev (NestJS + ts-node-dev) so we don't exhaust Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __omboo_prisma__: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__omboo_prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__omboo_prisma__ = prisma;
}

export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
