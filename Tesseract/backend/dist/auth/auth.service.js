"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const app_error_1 = require("../common/app-error");
const cache_service_1 = require("../common/cache.service");
const env_1 = require("../config/env");
const activity_service_1 = require("../activity/activity.service");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const user_service_1 = require("../users/user.service");
const domainRegex = /@(ds|es)\.study\.iitm\.ac\.in$/i;
let AuthService = class AuthService {
    prisma;
    cache;
    users;
    features;
    activity;
    constructor(prisma, cache, users, features, activity) {
        this.prisma = prisma;
        this.cache = cache;
        this.users = users;
        this.features = features;
        this.activity = activity;
    }
    normalizeStudentEmail(email) {
        const normalized = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            throw new app_error_1.AppError("invalid_email", "Enter a valid email address.", 422);
        }
        if (!domainRegex.test(normalized)) {
            throw new app_error_1.AppError("invalid_domain", "Only IITM student email addresses are allowed.", 400);
        }
        return normalized;
    }
    async refresh(rawRefreshToken, clientIp, userAgent) {
        if (!rawRefreshToken)
            throw new app_error_1.AppError("invalid_refresh", "Refresh token is missing.", 401);
        const tokenHash = this.hashToken(rawRefreshToken);
        const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash }, include: { user: true } });
        if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now() || session.user.deletedAt) {
            throw new app_error_1.AppError("invalid_refresh", "Invalid refresh token.", 401);
        }
        await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
        const pair = await this.issueSession(session.user, clientIp, userAgent, session.sessionFamilyId, session.id);
        return { token: pair.accessToken, refreshToken: pair.refreshToken, user: await this.users.publicUser(session.user, { id: session.user.id, role: session.user.role }) };
    }
    async loginWithPassword(email, password, clientIp, userAgent) {
        const normalized = this.normalizeStudentEmail(email);
        if (!password || password.length < 6) {
            throw new app_error_1.AppError("invalid_credentials", "Email or password is incorrect.", 401);
        }
        const ipCount = await this.cache.incrementWithTtl(`rate:login:ip:${clientIp}`, 60);
        if (ipCount > 10) {
            throw new app_error_1.AppError("rate_limited", "Too many login attempts. Try again later.", 429);
        }
        const user = await this.prisma.user.findUnique({ where: { email: normalized } });
        if (!user || user.deletedAt || !user.passwordHash) {
            throw new app_error_1.AppError("invalid_credentials", "Email or password is incorrect.", 401);
        }
        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) {
            throw new app_error_1.AppError("invalid_credentials", "Email or password is incorrect.", 401);
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
    async signupWithPassword(email, password, name, clientIp, userAgent) {
        const normalized = this.normalizeStudentEmail(email);
        if (!password || password.length < 8) {
            throw new app_error_1.AppError("weak_password", "Password must be at least 8 characters.", 422);
        }
        const signupEnabled = await this.features.getGlobalValue("auth.signup_enabled");
        if (signupEnabled === false) {
            throw new app_error_1.AppError("signup_disabled", "Signup is currently disabled.", 503);
        }
        const ipCount = await this.cache.incrementWithTtl(`rate:signup:ip:${clientIp}`, 60 * 60);
        if (ipCount > 5) {
            throw new app_error_1.AppError("rate_limited", "Too many signup attempts. Try again later.", 429);
        }
        const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
        if (existing && existing.passwordHash) {
            throw new app_error_1.AppError("user_exists", "An account with this email already exists. Sign in instead.", 409);
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
                    level: (0, user_service_1.levelForXp)(0)
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
    async loginWithGoogle(idToken, clientIp, userAgent) {
        if (!idToken)
            throw new app_error_1.AppError("invalid_token", "Google id_token is required.", 400);
        const ipCount = await this.cache.incrementWithTtl(`rate:google:ip:${clientIp}`, 60);
        if (ipCount > 20) {
            throw new app_error_1.AppError("rate_limited", "Too many Google sign-in attempts. Try again later.", 429);
        }
        let info;
        try {
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
            if (!response.ok) {
                throw new app_error_1.AppError("invalid_token", "Google sign-in failed. Please try again.", 401);
            }
            info = await response.json();
        }
        catch (err) {
            if (err instanceof app_error_1.AppError)
                throw err;
            throw new app_error_1.AppError("invalid_token", "Could not verify Google token.", 401);
        }
        const validIss = info.iss === "https://accounts.google.com" || info.iss === "accounts.google.com";
        if (!validIss)
            throw new app_error_1.AppError("invalid_token", "Invalid Google token issuer.", 401);
        if (env_1.env.googleClientId && info.aud !== env_1.env.googleClientId) {
            throw new app_error_1.AppError("invalid_token", "Token audience does not match expected client.", 401);
        }
        const verified = info.email_verified === true || info.email_verified === "true";
        if (!info.email || !verified) {
            throw new app_error_1.AppError("invalid_token", "Google account email is not verified.", 401);
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
        }
        else {
            const signupEnabled = await this.features.getGlobalValue("auth.signup_enabled");
            if (signupEnabled === false) {
                throw new app_error_1.AppError("signup_disabled", "Signup is currently disabled.", 503);
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
                    level: (0, user_service_1.levelForXp)(0)
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
    async logout(rawRefreshToken, rawAccessToken, userId) {
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
            }
            catch {
            }
        }
        if (userId) {
            await this.activity.log({ action: "auth_logout", title: "Signed out of Tesseract", actorUserId: userId, subjectUserId: userId });
        }
    }
    createAccessToken(userId, role) {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            sub: userId,
            role,
            type: "access",
            jti: (0, node_crypto_1.randomUUID)(),
            iat: now,
            exp: now + env_1.env.accessTokenExpireMinutes * 60
        };
        return jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, { algorithm: "HS256" });
    }
    verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret, { algorithms: ["HS256"] });
            if (payload.type !== "access" || !payload.sub || !payload.jti)
                throw new Error("Invalid token");
            return payload;
        }
        catch {
            throw new app_error_1.AppError("invalid_token", "Invalid or expired access token.", 401);
        }
    }
    hashToken(token) {
        return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    async issueSession(user, clientIp, userAgent, familyId = (0, node_crypto_1.randomUUID)(), rotatedFromId) {
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
        await this.prisma.refreshSession.create({
            data: {
                userId: user.id,
                sessionFamilyId: familyId,
                tokenHash: this.hashToken(refreshToken),
                userAgent: userAgent ?? null,
                ipAddress: clientIp,
                expiresAt: new Date(Date.now() + env_1.env.refreshTokenExpireDays * 24 * 60 * 60_000),
                lastUsedAt: new Date(),
                rotatedFromId: rotatedFromId
            }
        });
        return { accessToken: this.createAccessToken(user.id, user.role), refreshToken };
    }
    inferName(email) {
        const local = email.split("@")[0] ?? "student";
        return local
            .replace(/[^a-z0-9]+/gi, " ")
            .trim()
            .split(/\s+/)
            .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
            .join(" ") || "Tesseract User";
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        user_service_1.UserService,
        feature_service_1.FeatureService,
        activity_service_1.ActivityService])
], AuthService);
//# sourceMappingURL=auth.service.js.map