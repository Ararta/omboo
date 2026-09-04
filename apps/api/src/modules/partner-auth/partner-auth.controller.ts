import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { loginSchema, partnerRegisterSchema, refreshSchema } from "@omboo/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PartnerAuthService } from "./partner-auth.service";
import { refreshTtlMs } from "../auth/token.util";

const REFRESH_COOKIE = "omboo_partner_refresh_token";
const REFRESH_COOKIE_PATH = "/api/partner-auth";

// Tighter than the app-wide default — same rationale as AuthController's AUTH_THROTTLE.
const AUTH_THROTTLE = { default: { limit: 8, ttl: 60_000 } };

@Controller("partner-auth")
export class PartnerAuthController {
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  @Post("register")
  @HttpCode(201)
  @Throttle(AUTH_THROTTLE)
  async register(@Body(new ZodValidationPipe(partnerRegisterSchema)) dto: { companyName: string; contactName: string; email: string; phone: string; password: string }) {
    await this.partnerAuthService.register(dto.companyName, dto.contactName, dto.email, dto.phone, dto.password);
    return { ok: true };
  }

  @Post("login")
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.partnerAuthService.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (!token) throw new UnauthorizedException("Չկա թարմացման token։");
    refreshSchema.parse({ refreshToken: token });
    const result = await this.partnerAuthService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (token) await this.partnerAuthService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { ok: true };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshTtlMs(),
      path: REFRESH_COOKIE_PATH,
    });
  }
}
