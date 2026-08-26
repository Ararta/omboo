import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Mirrors reference/mrk_prototype_1.jsx `seedEmployees` + `DEFAULT_ORG` exactly, so the
// production demo data matches the validated prototype. Demo login password for every
// seeded user is "omboo1234" — local/demo only, never used in a real deployment.
//
// Multi-tenant: everything below is scoped to one demo Organization ("ararta"). Uniqueness
// (email, order sequences) isn't yet enforced by a DB constraint scoped to organizationId —
// that lands in the follow-up migration once this data is backfilled — so lookups here use
// findFirst instead of Prisma's typed upsert-by-unique-key.

const prisma = new PrismaClient();

const DEMO_PASSWORD = "omboo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const org = await prisma.organization.upsert({
    where: { slug: "ararta" },
    update: {},
    create: { name: "Արարտա", slug: "ararta" },
  });

  const existingOrgSettings = await prisma.orgSettings.findFirst({ where: { organizationId: org.id } });
  if (!existingOrgSettings) {
    await prisma.orgSettings.create({
      data: {
        organizationId: org.id,
        companyName: "Օրինակ ընկերության անվանում",
        address: "ք. Երևան, հասցե",
        phone: "+374 XX XXX XXX",
        email: "info@company.am",
        directorName: "Ա. Առաքելյան",
        directorSignatureKey: null,
        hrName: "Ն. Ներսիսյան",
        hrEmail: "hr@company.am",
      },
    });
  }

  const employeesSeed = [
    {
      name: "Անի Հակոբյան",
      position: "Մարքեթինգի մասնագետ",
      email: "ani.hakobyan@example.am",
      hireDate: "2022-04-01",
      minimumDays: 20,
      extendedDays: 0,
      additionalDays: 0,
      annualTotal: 20,
      balance: 20,
      dayOffBalance: 5,
      lastVacationRequestDate: "2022-04-01",
      priority: {},
    },
    {
      name: "Դավիթ Սարգսյան",
      position: "Ծրագրավորող",
      email: "davit.sargsyan@example.am",
      hireDate: "2021-02-15",
      minimumDays: 20,
      extendedDays: 0,
      additionalDays: 4,
      annualTotal: 24,
      balance: 11,
      dayOffBalance: 2,
      lastVacationRequestDate: "2024-03-01",
      priority: { priorityCaregiver: true },
    },
    {
      name: "Լիլիթ Պետրոսյան",
      position: "Հաշվապահ",
      email: "lilit.petrosyan@example.am",
      hireDate: "2023-09-10",
      minimumDays: 0,
      extendedDays: 25,
      additionalDays: 0,
      annualTotal: 25,
      balance: 25,
      dayOffBalance: 5,
      lastVacationRequestDate: "2023-09-10",
      priority: { priorityParentOrPregnant: true },
    },
  ] as const;

  for (const seed of employeesSeed) {
    let employee = await prisma.employee.findFirst({ where: { organizationId: org.id, email: seed.email } });
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          organizationId: org.id,
          name: seed.name,
          position: seed.position,
          email: seed.email,
          hireDate: new Date(seed.hireDate),
          minimumDays: seed.minimumDays,
          extendedDays: seed.extendedDays,
          additionalDays: seed.additionalDays,
          annualTotal: seed.annualTotal,
          balance: seed.balance,
          dayOffBalance: seed.dayOffBalance,
          lastVacationRequestDate: new Date(seed.lastVacationRequestDate),
          lastReminderFired: null,
          tenDayChunkConfirmed: false,
          ...seed.priority,
        },
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: seed.email } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          organizationId: org.id,
          email: seed.email,
          passwordHash,
          role: Role.EMPLOYEE,
          employeeId: employee.id,
        },
      });
    }
  }

  for (const [email, role] of [
    ["director@company.am", Role.DIRECTOR],
    ["hr@company.am", Role.HR],
  ] as const) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({ data: { organizationId: org.id, email, passwordHash, role } });
    }
  }

  for (const series of ["PRIMARY", "RECALL"] as const) {
    const year = new Date().getFullYear();
    const existing = await prisma.orderSequence.findFirst({ where: { organizationId: org.id, year, series } });
    if (!existing) {
      await prisma.orderSequence.create({ data: { organizationId: org.id, year, series, lastValue: 0 } });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Demo logins (password "${DEMO_PASSWORD}"): ani.hakobyan@example.am, davit.sargsyan@example.am, lilit.petrosyan@example.am, director@company.am, hr@company.am`,
  );
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
