import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { User } from "@omboo/database";
import { PrismaService } from "../../common/prisma/prisma.service";
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

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role, employeeId: user.employeeId };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException("Սխալ էլ. փոստ կամ գաղտնաբառ։");
    return this.issueTokenPair(user);
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
    const payload: JwtPayload = { sub: user.id, role: user.role, employeeId: user.employeeId };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret-dev-only",
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });

    const refreshToken = generateRefreshToken();
    await this.prisma.client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs()),
      },
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
