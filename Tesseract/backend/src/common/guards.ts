import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuthService } from "../auth/auth.service";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import { AppError } from "./app-error";
import { ALLOW_SUSPENDED, FEATURE_FLAG, PUBLIC_ROUTE, ROLES, type RoleName } from "./decorators";
import type { AuthedRequest } from "./types";
import { hasMinRole } from "./types";
import { CacheService } from "./cache.service";
import { env } from "../config/env";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("unauthenticated", "Authentication required.", 401);
    const token = header.slice("Bearer ".length);
    const payload = this.auth.verifyAccessToken(token);
    const blacklisted = await this.cache.getJson<boolean>(`blacklist:access:${payload.jti}`);
    if (blacklisted) throw new AppError("invalid_token", "Invalid or expired access token.", 401);
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, role: true, email: true }
    });
    if (!user) throw new AppError("unauthenticated", "Authentication required.", 401);
    const count = await this.cache.incrementWithTtl(`rate:user:${user.id}`, 60);
    if (count > env.userRateLimitPerMinute) throw new AppError("rate_limited", "Too many requests.", 429);
    req.user = user;
    return true;
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RoleName[]>(ROLES, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user) throw new AppError("unauthenticated", "Authentication required.", 401);
    const allowed = roles.some((role) => hasMinRole(user.role, role));
    if (!allowed) throw new AppError("forbidden", "You do not have access to this resource.", 403);
    return true;
  }
}

@Injectable()
export class SuspensionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    const allowSuspended = this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED, [context.getHandler(), context.getClass()]);
    if (isPublic || allowSuspended) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) return true;
    const suspension = await this.prisma.userSuspension.findFirst({
      where: {
        userId: req.user.id,
        liftedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: "desc" }
    });
    if (!suspension) return true;
    throw new AppError("suspended", "Your account is suspended.", 403, {
      until: suspension.expiresAt,
      reason: suspension.reason
    });
  }
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly features: FeatureService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(FEATURE_FLAG, [context.getHandler(), context.getClass()]);
    if (!key) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new AppError("unauthenticated", "Authentication required.", 401);
    const enabled = await this.features.isEnabledForUser(req.user.id, key);
    if (!enabled) throw new AppError("feature_disabled", "This feature is currently disabled.", 403, { flag: key });
    return true;
  }
}
