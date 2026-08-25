import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema } from "@omboo/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { refreshTtlMs } from "./token.util";

const REFRESH_COOKIE = "omboo_refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
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
