import { Body, Controller, Headers, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";

import { AllowSuspended, Public } from "../common/decorators";
import { parseBody } from "../common/zod";
import { env } from "../config/env";
import { AuthService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256)
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  name: z.string().trim().min(1).max(64).optional()
});

const googleSchema = z.object({
  idToken: z.string().min(1)
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = parseBody(loginSchema, body);
    const result = await this.auth.loginWithPassword(
      payload.email,
      payload.password,
      clientIp(req),
      req.headers["user-agent"]
    );
    setRefreshCookie(res, result.refreshToken);
    return { token: result.token, user: result.user };
  }

  @Public()
  @Post("signup")
  async signup(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = parseBody(signupSchema, body);
    const result = await this.auth.signupWithPassword(
      payload.email,
      payload.password,
      payload.name,
      clientIp(req),
      req.headers["user-agent"]
    );
    setRefreshCookie(res, result.refreshToken);
    return { token: result.token, user: result.user };
  }

  @Public()
  @Post("oauth/google")
  async google(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = parseBody(googleSchema, body);
    const result = await this.auth.loginWithGoogle(
      payload.idToken,
      clientIp(req),
      req.headers["user-agent"]
    );
    setRefreshCookie(res, result.refreshToken);
    return { token: result.token, user: result.user };
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(req.cookies?.[env.refreshCookieName], clientIp(req), req.headers["user-agent"]);
    setRefreshCookie(res, result.refreshToken);
    return { token: result.token, user: result.user };
  }

  @Public()
  @AllowSuspended()
  @Post("logout")
  async logout(@Req() req: Request, @Headers("authorization") authorization: string | undefined, @Res({ passthrough: true }) res: Response) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
    await this.auth.logout(req.cookies?.[env.refreshCookieName], token, (req as Request & { user?: { id: string } }).user?.id);
    res.clearCookie(env.refreshCookieName, { path: `${env.apiPrefix}/auth` });
    return { ok: true };
  }
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: `${env.apiPrefix}/auth`,
    maxAge: env.refreshTokenExpireDays * 24 * 60 * 60 * 1000
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.ip || req.socket.remoteAddress || "unknown";
}
