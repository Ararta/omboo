import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import type { User } from "@omboo/database";
import { runWithOrgId } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateRefreshToken, hashToken, refreshTtlMs } from "./token.util";
import type { JwtPayload } from "./jwt.strategy";

export interface PublicUser {
  id: string;
  email: string;
  role: User["role"];
  employeeId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/** "Backend" roles that must go through TOTP two-factor before a session is issued. */
const TWO_FACTOR_ROLES: User["role"][] = ["HR", "DIRECTOR"];

// Ephemeral setup/challenge tokens are signed with a distinct secret so they can never be
// mistaken for a real access token by JwtStrategy (which only trusts JWT_ACCESS_SECRET).
const EPHEMERAL_SECRET = `${process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only"}:ephemeral`;

interface EphemeralPayload {
  sub: string;
  purpose: "totp-setup" | "totp-challenge";
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role, employeeId: user.employeeId };
}

export type LoginResult =
  | TokenPair
  | { totpSetupRequired: true; setupToken: string; qrCodeDataUrl: string; secret: string }
  | { requiresTotp: true; challengeToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  /** Founds a brand-new organization on Omboo — creates the Organization and its first DIRECTOR
   * account in one transaction. Auto-approved: there is no existing director to review them,
   * they're the one founding the tenant. */
  async registerOrganization(
    organizationName: string,
    orgSlug: string,
    directorName: string,
    email: string,
    password: string,
  ): Promise<void> {
    const existingSlug = await this.prisma.client.organization.findUnique({ where: { slug: orgSlug } });
    if (existingSlug) throw new ConflictException("Այս հասցեով (slug) կազմակերպություն արդեն գոյություն ունի։");
    const existingEmail = await this.prisma.client.user.findUnique({ where: { email } });
    if (existingEmail) throw new ConflictException("Այս էլ. փոստով հաշիվ արդեն գոյություն ունի։");
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.client.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: organizationName, slug: orgSlug } });
      await tx.user.create({
        data: {
          organizationId: org.id,
          name: directorName,
          email,
          passwordHash,
          role: "DIRECTOR",
          pendingApproval: false,
        },
      });
    });
  }

  /** Requests backend (HR) access to an organization that already exists on Omboo — always
   * creates a pending, unapproved HR account and notifies only that organization's directors.
   * Never issues tokens directly. Runs pre-auth (no ambient tenant context yet), so the
   * notifyRole call is explicitly wrapped in the resolved org's context. */
  async register(name: string, email: string, password: string, orgSlug: string): Promise<void> {
    const org = await this.prisma.client.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) throw new ConflictException("Այս հասցեով (slug) կազմակերպություն չի գտնվել։");
    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Այս էլ. փոստով հաշիվ արդեն գոյություն ունի։");
    const passwordHash = await bcrypt.hash(password, 10);

    await runWithOrgId(org.id, () =>
      this.prisma.client.$transaction(async (tx) => {
        await tx.user.create({
          data: { organizationId: org.id, name, email, passwordHash, role: "HR", pendingApproval: true },
        });
        await this.notificationsService.notifyRole(
          tx,
          "DIRECTOR",
          `${name} (${email}) մուտքի հայտ է ուղարկել ՄՌԿ մասնագետի իրավունքների համար. սպասում է հաստատման։`,
        );
      }),
    );
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException("Սխալ էլ. փոստ կամ գաղտնաբառ։");
    if (user.pendingApproval) {
      throw new ForbiddenException("Ձեր հաշիվը դեռ սպասում է տնoրենի հաստատմանը։");
    }

    if (TWO_FACTOR_ROLES.includes(user.role)) {
      if (!user.totpEnabled) return this.beginTotpSetup(user);
      return {
        requiresTotp: true,
        challengeToken: this.signEphemeral({ sub: user.id, purpose: "totp-challenge" }),
      };
    }

    return this.issueTokenPair(user);
  }

  private async beginTotpSetup(user: User) {
    const secret = authenticator.generateSecret();
    await this.prisma.client.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    const otpauthUrl = authenticator.keyuri(user.email, "Omboo", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return {
      totpSetupRequired: true as const,
      setupToken: this.signEphemeral({ sub: user.id, purpose: "totp-setup" }),
      qrCodeDataUrl,
      secret,
    };
  }

  async confirmTotpSetup(setupToken: string, code: string): Promise<TokenPair> {
    const user = await this.loadFromEphemeral(setupToken, "totp-setup");
    if (!user.totpSecret || !authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new UnauthorizedException("Սխալ հաստատման կոդ։");
    }
    const updated = await this.prisma.client.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    return this.issueTokenPair(updated);
  }

  async verifyTotp(challengeToken: string, code: string): Promise<TokenPair> {
    const user = await this.loadFromEphemeral(challengeToken, "totp-challenge");
    if (!user.totpSecret || !authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new UnauthorizedException("Սխալ հաստատման կոդ։");
    }
    return this.issueTokenPair(user);
  }

  /** Pending self-registered HR accounts awaiting DIRECTOR review. */
  listPendingUsers() {
    return this.prisma.client.user.findMany({
      where: { pendingApproval: true },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async approvePendingUser(id: string): Promise<void> {
    const user = await this.prisma.client.user.update({ where: { id }, data: { pendingApproval: false } });
    await this.prisma.client.notification.create({
      data: {
        userId: user.id,
        text: "Ձեր մուտքի հայտը հաստատվել է տնoրենի կողմից։ Այժմ կարող եք մուտք գործել։",
        organizationId: user.organizationId,
      },
    });
  }

  async rejectPendingUser(id: string): Promise<void> {
    await this.prisma.client.user.deleteMany({ where: { id, pendingApproval: true } });
  }

  private signEphemeral(payload: EphemeralPayload): string {
    return this.jwtService.sign(payload, { secret: EPHEMERAL_SECRET, expiresIn: "10m" });
  }

  private async loadFromEphemeral(token: string, purpose: EphemeralPayload["purpose"]): Promise<User> {
    let payload: EphemeralPayload;
    try {
      payload = this.jwtService.verify<EphemeralPayload>(token, { secret: EPHEMERAL_SECRET });
    } catch {
      throw new UnauthorizedException("Հաստատման ժամկետը լրացել է, մուտք գործեք կրկին։");
    }
    if (payload.purpose !== purpose) throw new UnauthorizedException("Անվավեր token։");
    const user = await this.prisma.client.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Օգտատերը չի գտնվել։");
    return user;
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.client.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Սեսիան ավարտվել է, մուտք գործեք կրկին։");
    }
    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.client.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokenPair(record.user);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId,
      organizationId: user.organizationId,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only",
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });

    const refreshToken = generateRefreshToken();
    await this.prisma.client.refreshToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs()),
      },
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
