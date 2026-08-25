import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Mirrors reference/mrk_prototype_1.jsx `seedEmployees` + `DEFAULT_ORG` exactly, so the
// production demo data matches the validated prototype. Demo login password for every
// seeded user is "omboo1234" — local/demo only, never used in a real deployment.

const prisma = new PrismaClient();

const DEMO_PASSWORD = "omboo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.orgSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
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
    const employee = await prisma.employee.upsert({
      where: { email: seed.email },
      update: {},
      create: {
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

    await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash,
        role: Role.EMPLOYEE,
        employeeId: employee.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "director@company.am" },
    update: {},
    create: { email: "director@company.am", passwordHash, role: Role.DIRECTOR },
  });

  await prisma.user.upsert({
    where: { email: "hr@company.am" },
    update: {},
    create: { email: "hr@company.am", passwordHash, role: Role.HR },
  });

  await prisma.orderSequence.upsert({
    where: { year_series: { year: new Date().getFullYear(), series: "PRIMARY" } },
    update: {},
    create: { year: new Date().getFullYear(), series: "PRIMARY", lastValue: 0 },
  });
  await prisma.orderSequence.upsert({
    where: { year_series: { year: new Date().getFullYear(), series: "RECALL" } },
    update: {},
    create: { year: new Date().getFullYear(), series: "RECALL", lastValue: 0 },
  });

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
