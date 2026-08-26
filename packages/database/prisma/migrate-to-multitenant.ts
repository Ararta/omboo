import { PrismaClient } from "@prisma/client";

// One-time backfill: everything created before the multi-tenant migration belongs to the
// company that already exists in the DB (its OrgSettings row, if any, or falls back to the
// "ararta" demo org). Run once against a DB that predates the multi-tenant schema; safe to
// re-run (idempotent — only touches rows where organizationId IS NULL).

const prisma = new PrismaClient();

const TABLES_WITH_ORG_COLUMN = [
  "users",
  "refresh_tokens",
  "employees",
  "employee_documents",
  "attendance_logs",
  "requests",
  "request_history",
  "recalls",
  "org_settings",
  "order_sequences",
  "notifications",
  "balance_adjustment_log",
  "audit_log",
] as const;

async function main() {
  const existingSettings = await prisma.orgSettings.findFirst({ where: { organizationId: null } });

  let org = await prisma.organization.findFirst({ where: { slug: "ararta" } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: existingSettings?.companyName || "Արարտա", slug: "ararta" },
    });
  }

  for (const table of TABLES_WITH_ORG_COLUMN) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "organizationId" = $1 WHERE "organizationId" IS NULL`,
      org.id,
    );
    // eslint-disable-next-line no-console
    console.log(`${table}: backfilled ${result} row(s) -> organizationId=${org.id}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Backfill complete. Organization: ${org.name} (${org.id}, slug="${org.slug}")`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
