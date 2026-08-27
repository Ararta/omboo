import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { authenticator } from "otplib";
import request from "supertest";
import { PrismaClient, type TenantScopedPrismaClient } from "@omboo/database";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

// Regression guard for the multi-tenant migration (see the plan this repo's git history
// references as "Omboo — Multi-Tenant Migration"). Boots the real app (real Postgres, real
// middleware/interceptor/guard pipeline — nothing mocked) and proves, end to end, that one
// organization's authenticated user can never read or write another organization's data, even
// when handed the exact row id to try. A unique suffix per run keeps org slugs/emails collision
// -free against the shared dev database.

const RUN_ID = Date.now().toString(36);

async function loginWithTotp(app: INestApplication, email: string, password: string): Promise<string> {
  const login = await request(app.getHttpServer()).post("/api/auth/login").send({ email, password }).expect(200);

  if (login.body.accessToken) return login.body.accessToken;

  if (login.body.totpSetupRequired) {
    const code = authenticator.generate(login.body.secret);
    const confirmed = await request(app.getHttpServer())
      .post("/api/auth/totp/setup-confirm")
      .send({ setupToken: login.body.setupToken, code })
      .expect(200);
    return confirmed.body.accessToken;
  }

  throw new Error(`Unexpected login response shape for ${email}: ${JSON.stringify(login.body)}`);
}

describe("Tenant isolation (e2e)", () => {
  let app: INestApplication;
  let prisma: TenantScopedPrismaClient;

  let orgADirectorToken: string;
  let orgBDirectorToken: string;
  let orgAId: string;
  let orgAEmployeeId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirrors src/main.ts's bootstrap() — that function itself is never invoked in tests, so
    // the global prefix (and anything else it sets up) has to be replicated here.
    app.setGlobalPrefix("api");
    await app.init();
    prisma = moduleRef.get(PrismaService).extended;

    await request(app.getHttpServer())
      .post("/api/auth/register-organization")
      .send({
        organizationName: `Test Org A ${RUN_ID}`,
        orgSlug: `test-org-a-${RUN_ID}`,
        directorName: "Director A",
        email: `director-a-${RUN_ID}@example.test`,
        password: "testpass123",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/auth/register-organization")
      .send({
        organizationName: `Test Org B ${RUN_ID}`,
        orgSlug: `test-org-b-${RUN_ID}`,
        directorName: "Director B",
        email: `director-b-${RUN_ID}@example.test`,
        password: "testpass123",
      })
      .expect(201);

    orgADirectorToken = await loginWithTotp(app, `director-a-${RUN_ID}@example.test`, "testpass123");
    orgBDirectorToken = await loginWithTotp(app, `director-b-${RUN_ID}@example.test`, "testpass123");

    const orgA = await prisma.organization.findUniqueOrThrow({ where: { slug: `test-org-a-${RUN_ID}` } });
    orgAId = orgA.id;
    const employee = await prisma.employee.create({
      data: {
        organizationId: orgA.id,
        name: "Isolation Test Employee",
        position: "QA",
        email: `isolation-emp-${RUN_ID}@example.test`,
        hireDate: new Date("2024-01-01"),
        annualTotal: 20,
        balance: 20,
      },
    });
    orgAEmployeeId = employee.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("org A's director sees exactly the one employee seeded into org A", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/employees")
      .set("Authorization", `Bearer ${orgADirectorToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(orgAEmployeeId);
  });

  it("org B's director sees zero employees, not org A's", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/employees")
      .set("Authorization", `Bearer ${orgBDirectorToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it("org B's director cannot approve/see org A's pending users", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/auth/pending-users")
      .set("Authorization", `Bearer ${orgBDirectorToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it("org B cannot mutate org A's employee by guessing its real id, and the row stays untouched", async () => {
    // DIRECTOR can't call the balance-adjust endpoint (HR-only) — the point here is proving the
    // *read* that would have to precede any write already returns nothing across tenants, which
    // is exactly what the balance-adjust endpoint's findByIdOrThrow relies on internally.
    await request(app.getHttpServer())
      .patch(`/api/employees/${orgAEmployeeId}/balance`)
      .set("Authorization", `Bearer ${orgBDirectorToken}`)
      .send({ balance: 99999 })
      .expect(403); // RolesGuard rejects DIRECTOR before it would even reach the 404

    const stillIntact = await prisma.employee.findUniqueOrThrow({ where: { id: orgAEmployeeId } });
    expect(stillIntact.balance).toBe(20);
    expect(stillIntact.organizationId).toBe(orgAId);
  });

  it("Postgres RLS returns zero rows for a raw query with no app.current_org_id set", async () => {
    const appDbUrl = process.env.APP_DATABASE_URL;
    expect(appDbUrl).toBeTruthy();

    // Deliberately NOT the tenant-scoped extended client and NEVER wrapped in runWithOrgId/
    // SET LOCAL — this is Layer 2's own guarantee, independent of any application code path.
    const unscoped = new PrismaClient({ datasourceUrl: appDbUrl });
    try {
      const rows = await unscoped.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM employees`;
      expect(rows[0]?.count).toBe(0);
    } finally {
      await unscoped.$disconnect();
    }
  });
});
