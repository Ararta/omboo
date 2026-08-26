import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema, registerSchema, totpSetupConfirmSchema, totpVerifySchema } from "@omboo/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthService } from "./auth.service";
import { refreshTtlMs } from "./token.util";

const REFRESH_COOKIE = "omboo_refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(201)
  async register(@Body(new ZodValidationPipe(registerSchema)) dto: { name: string; email: string; password: string }) {
    await this.authService.register(dto.name, dto.email, dto.password);
    return { ok: true };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);
    if ("refreshToken" in result) this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("totp/setup-confirm")
  @HttpCode(200)
  async confirmTotpSetup(
    @Body(new ZodValidationPipe(totpSetupConfirmSchema)) dto: { setupToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.confirmTotpSetup(dto.setupToken, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("totp/verify")
  @HttpCode(200)
  async verifyTotp(
    @Body(new ZodValidationPipe(totpVerifySchema)) dto: { challengeToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTotp(dto.challengeToken, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Get("pending-users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("DIRECTOR")
  listPendingUsers() {
    return this.authService.listPendingUsers();
  }

  @Post("pending-users/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("DIRECTOR")
  @HttpCode(200)
  async approvePendingUser(@Param("id") id: string) {
    await this.authService.approvePendingUser(id);
    return { ok: true };
  }

  @Post("pending-users/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("DIRECTOR")
  @HttpCode(200)
  async rejectPendingUser(@Param("id") id: string) {
    await this.authService.rejectPendingUser(id);
    return { ok: true };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (!token) throw new UnauthorizedException("Չկա թարմացման token։");
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (token) await this.authService.logout(token);
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
