import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import { AppError } from "../common/app-error";
import { CacheService } from "../common/cache.service";
import { env } from "../config/env";
import { ActivityService } from "../activity/activity.service";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import { levelForXp, UserService } from "../users/user.service";
import type { Role } from "../common/types";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  deletedAt: Date | null;
};

type AccessPayload = {
  sub: string;
  role: Role;
  type: "access";
  jti: string;
  iat: number;
  exp: number;
};

const domainRegex = /@(ds|es)\.study\.iitm\.ac\.in$/i;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly users: UserService,
    private readonly features: FeatureService,
    private readonly activity: ActivityService
  ) {}

  normalizeStudentEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new AppError("invalid_email", "Enter a valid email address.", 422);
    }
    if (!domainRegex.test(normalized)) {
      throw new AppError("invalid_domain", "Only IITM student email addresses are allowed.", 400);
    }
    return normalized;
  }

  async refresh(rawRefreshToken: string | undefined, clientIp: string, userAgent?: string | null) {
    if (!rawRefreshToken) throw new AppError("invalid_refresh", "Refresh token is missing.", 401);
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now() || session.user.deletedAt) {
      throw new AppError("invalid_refresh", "Invalid refresh token.", 401);
    }
    await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
    const pair = await this.issueSession(session.user, clientIp, userAgent, session.sessionFamilyId, session.id as string);
    return { token: pair.accessToken, refreshToken: pair.refreshToken, user: await this.users.publicUser(session.user, { id: session.user.id, role: session.user.role }) };
  }

  async loginWithPassword(email: string, password: string, clientIp: string, userAgent?: string | null) {
    const normalized = this.normalizeStudentEmail(email);
    if (!password || password.length < 6) {
      throw new AppError("invalid_credentials", "Email or password is incorrect.", 401);
    }
    const ipCount = await this.cache.incrementWithTtl(`rate:login:ip:${clientIp}`, 60);
    if (ipCount > 10) {
      throw new AppError("rate_limited", "Too many login attempts. Try again later.", 429);
    }
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new AppError("invalid_credentials", "Email or password is incorrect.", 401);
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new AppError("invalid_credentials", "Email or password is incorrect.", 401);
    }
    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, lastSeenAt: now, verifiedAt: user.verifiedAt ?? now }
    });
    const pair = await this.issueSession(updated, clientIp, userAgent);
    await this.activity.log({
      action: "auth_login",
      title: "Signed in to Tesseract",
      actorUserId: updated.id,
      subjectUserId: updated.id,
      meta: { method: "password" }
    });
    return {
      token: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: await this.users.publicUser(updated, { id: updated.id, role: updated.role })
    };
  }

  async signupWithPassword(email: string, password: string, name: string | undefined, clientIp: string, userAgent?: string | null) {
    const normalized = this.normalizeStudentEmail(email);
    if (!password || password.length < 8) {
      throw new AppError("weak_password", "Password must be at least 8 characters.", 422);
    }
    const signupEnabled = await this.features.getGlobalValue("auth.signup_enabled");
    if (signupEnabled === false) {
      throw new AppError("signup_disabled", "Signup is currently disabled.", 503);
    }
    const ipCount = await this.cache.incrementWithTtl(`rate:signup:ip:${clientIp}`, 60 * 60);
    if (ipCount > 5) {
      throw new AppError("rate_limited", "Too many signup attempts. Try again later.", 429);
    }
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing && existing.passwordHash) {
      throw new AppError("user_exists", "An account with this email already exists. Sign in instead.", 409);
    }
    const passwordHash = await argon2.hash(password);
    const now = new Date();
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            verifiedAt: existing.verifiedAt ?? now,
            lastLoginAt: now,
            lastSeenAt: now,
            ...(name ? { name: name.trim() } : {})
          }
        })
      : await this.prisma.user.create({
          data: {
            email: normalized,
            name: name?.trim() || this.inferName(normalized),
            role: "guest",
            passwordHash,
            verifiedAt: now,
            lastLoginAt: now,
            lastSeenAt: now,
            level: levelForXp(0)
          }
        });
    const pair = await this.issueSession(user, clientIp, userAgent);
    await this.activity.log({
      action: "auth_signup",
      title: "Created Tesseract account",
      actorUserId: user.id,
      subjectUserId: user.id,
      meta: { method: "password" }
    });
    return {
      token: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: await this.users.publicUser(user, { id: user.id, role: user.role })
    };
  }

  async loginWithGoogle(idToken: string, clientIp: string, userAgent?: string | null) {
    if (!idToken) throw new AppError("invalid_token", "Google id_token is required.", 400);
    const ipCount = await this.cache.incrementWithTtl(`rate:google:ip:${clientIp}`, 60);
    if (ipCount > 20) {
      throw new AppError("rate_limited", "Too many Google sign-in attempts. Try again later.", 429);
    }
    // Verify the id_token via Google's tokeninfo endpoint (no extra dependency needed).
    let info: {
      iss?: string;
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      sub?: string;
      name?: string;
      picture?: string;
      hd?: string;
    };
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!response.ok) {
        throw new AppError("invalid_token", "Google sign-in failed. Please try again.", 401);
      }
      info = await response.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("invalid_token", "Could not verify Google token.", 401);
    }
    const validIss = info.iss === "https://accounts.google.com" || info.iss === "accounts.google.com";
    if (!validIss) throw new AppError("invalid_token", "Invalid Google token issuer.", 401);
    if (env.googleClientId && info.aud !== env.googleClientId) {
      throw new AppError("invalid_token", "Token audience does not match expected client.", 401);
    }
    const verified = info.email_verified === true || info.email_verified === "true";
    if (!info.email || !verified) {
      throw new AppError("invalid_token", "Google account email is not verified.", 401);
    }
    const normalized = this.normalizeStudentEmail(info.email);
    const sub = info.sub;
    const now = new Date();
    let user = sub ? await this.prisma.user.findUnique({ where: { googleSub: sub } }) : null;
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: normalized } });
    }
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: sub ?? user.googleSub,
          verifiedAt: user.verifiedAt ?? now,
          lastLoginAt: now,
          lastSeenAt: now,
          ...(info.picture && !user.avatarUrl ? { avatarUrl: info.picture } : {}),
          ...(info.name && (user.name === normalized || !user.name) ? { name: info.name } : {})
        }
      });
    } else {
      const signupEnabled = await this.features.getGlobalValue("auth.signup_enabled");
      if (signupEnabled === false) {
        throw new AppError("signup_disabled", "Signup is currently disabled.", 503);
      }
      user = await this.prisma.user.create({
        data: {
          email: normalized,
          name: info.name?.trim() || this.inferName(normalized),
          role: "guest",
          googleSub: sub,
          avatarUrl: info.picture,
          verifiedAt: now,
          lastLoginAt: now,
          lastSeenAt: now,
          level: levelForXp(0)
        }
      });
    }
    const pair = await this.issueSession(user, clientIp, userAgent);
    await this.activity.log({
      action: "auth_login",
      title: "Signed in to Tesseract",
      actorUserId: user.id,
      subjectUserId: user.id,
      meta: { method: "google" }
    });
    return {
      token: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: await this.users.publicUser(user, { id: user.id, role: user.role })
    };
  }

  async logout(rawRefreshToken: string | undefined, rawAccessToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      await this.prisma.refreshSession.updateMany({
        where: { tokenHash: this.hashToken(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    if (rawAccessToken) {
      try {
        const payload = this.verifyAccessToken(rawAccessToken);
        await this.cache.setJson(`blacklist:access:${payload.jti}`, true, Math.max(payload.exp - Math.floor(Date.now() / 1000), 1));
      } catch {
        // Logout should be idempotent for expired/invalid access tokens.
      }
    }
    if (userId) {
      await this.activity.log({ action: "auth_logout", title: "Signed out of Tesseract", actorUserId: userId, subjectUserId: userId });
    }
  }

  createAccessToken(userId: string, role: Role): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessPayload = {
      sub: userId,
      role,
      type: "access",
      jti: randomUUID(),
      iat: now,
      exp: now + env.accessTokenExpireMinutes * 60
    };
    return jwt.sign(payload, env.jwtSecret, { algorithm: "HS256" });
  }

  verifyAccessToken(token: string): AccessPayload {
    try {
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as AccessPayload;
      if (payload.type !== "access" || !payload.sub || !payload.jti) throw new Error("Invalid token");
      return payload;
    } catch {
      throw new AppError("invalid_token", "Invalid or expired access token.", 401);
    }
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueSession(user: User, clientIp: string, userAgent?: string | null, familyId: string = randomUUID(), rotatedFromId?: string) {
    const refreshToken = randomBytes(32).toString("hex");
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        sessionFamilyId: familyId,
        tokenHash: this.hashToken(refreshToken),
        userAgent: userAgent ?? null,
        ipAddress: clientIp,
        expiresAt: new Date(Date.now() + env.refreshTokenExpireDays * 24 * 60 * 60_000),
        lastUsedAt: new Date(),
        rotatedFromId: rotatedFromId as any
      }
    });
    return { accessToken: this.createAccessToken(user.id, user.role), refreshToken };
  }

  private inferName(email: string): string {
    const local = email.split("@")[0] ?? "student";
    return local
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .split(/\s+/)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join(" ") || "Tesseract User";
  }
}
