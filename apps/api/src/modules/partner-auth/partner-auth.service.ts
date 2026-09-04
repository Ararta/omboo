import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { PartnerUser } from "@omboo/database";
import { PartnerPrismaService } from "../../common/prisma/partner-prisma.service";
import { generateRefreshToken, hashToken, refreshTtlMs } from "../auth/token.util";
import type { PartnerJwtPayload } from "./partner-jwt.strategy";

export interface PublicPartnerUser {
  id: string;
  email: string;
  name: string;
  companyName: string;
}

export interface PartnerTokenPair {
  accessToken: string;
  refreshToken: string;
  user: PublicPartnerUser;
}

function toPublicPartnerUser(user: PartnerUser, companyName: string): PublicPartnerUser {
  return { id: user.id, email: user.email, name: user.name, companyName };
}

// Partner-portal counterpart to AuthService — deliberately much simpler: no TOTP/2FA (not a
// "backend" role), no pendingApproval gate (self-registration is immediately active, a decision
// made explicitly to avoid a manual-review bottleneck at partner-acquisition scale). Uses its
// own PartnerPrismaService/PartnerJwtPayload/secret throughout — never touches AuthService,
// User, JwtStrategy, or anything from the org-side auth system.
@Injectable()
export class PartnerAuthService {
  constructor(
    private readonly partnerPrisma: PartnerPrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validatePartnerUser(email: string, password: string): Promise<PartnerUser | null> {
    const user = await this.partnerPrisma.client.partnerUser.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  /** Self-service partner signup — creates the Partner and its first (immediately active,
   * OWNER-role) PartnerUser in one transaction. Pre-auth, so this opens its own explicit
   * transaction directly on the base client, same pattern as AuthService.registerOrganization. */
  async register(companyName: string, contactName: string, email: string, phone: string, password: string): Promise<void> {
    const existingEmail = await this.partnerPrisma.client.partnerUser.findUnique({ where: { email } });
    if (existingEmail) throw new ConflictException("Այս էլ. փոստով հաշիվ արդեն գոյություն ունի։");
    const existingPartnerEmail = await this.partnerPrisma.client.partner.findUnique({ where: { email } });
    if (existingPartnerEmail) throw new ConflictException("Այս էլ. փոստով կազմակերպություն արդեն գրանցված է։");
    const passwordHash = await bcrypt.hash(password, 10);

    await this.partnerPrisma.extended.$transaction(async (tx) => {
      const partner = await tx.partner.create({ data: { companyName, contactName, email, phone } });
      await tx.partnerUser.create({
        data: { partnerId: partner.id, email, passwordHash, name: contactName, role: "OWNER" },
      });
    });
  }

  async login(email: string, password: string): Promise<PartnerTokenPair> {
    const user = await this.validatePartnerUser(email, password);
    if (!user) throw new UnauthorizedException("Սխալ էլ. փոստ կամ գաղտնաբառ։");
    return this.issueTokenPair(user);
  }

  async refresh(rawToken: string): Promise<PartnerTokenPair> {
    const tokenHash = hashToken(rawToken);
    const record = await this.partnerPrisma.client.partnerRefreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { partnerUser: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Սեսիան ավարտվել է, մուտք գործեք կրկին։");
    }
    // Rotate: revoke the used token, issue a fresh pair.
    await this.partnerPrisma.client.partnerRefreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokenPair(record.partnerUser);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.partnerPrisma.client.partnerRefreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(user: PartnerUser): Promise<PartnerTokenPair> {
    // partners carries no RLS and isn't partner-scoped by the extension either (Partner itself
    // is never in PARTNER_MODELS), so this resolves regardless of whether a request context is set.
    const partner = await this.partnerPrisma.client.partner.findUniqueOrThrow({
      where: { id: user.partnerId },
      select: { companyName: true },
    });

    const payload: PartnerJwtPayload = { sub: user.id, partnerId: user.partnerId, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.PARTNER_JWT_ACCESS_SECRET ?? "change-me-partner-access-secret-dev-only",
      expiresIn: process.env.PARTNER_JWT_ACCESS_TTL ?? "15m",
    });

    const refreshToken = generateRefreshToken();
    await this.partnerPrisma.client.partnerRefreshToken.create({
      data: {
        partnerUserId: user.id,
        partnerId: user.partnerId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs()),
      },
    });

    return { accessToken, refreshToken, user: toPublicPartnerUser(user, partner.companyName) };
  }
}
