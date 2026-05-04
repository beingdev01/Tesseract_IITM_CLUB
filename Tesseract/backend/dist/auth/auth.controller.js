"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const env_1 = require("../config/env");
const auth_service_1 = require("./auth.service");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1).max(256)
});
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(256),
    name: zod_1.z.string().trim().min(1).max(64).optional()
});
const googleSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1)
});
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async login(body, req, res) {
        const payload = (0, zod_2.parseBody)(loginSchema, body);
        const result = await this.auth.loginWithPassword(payload.email, payload.password, clientIp(req), req.headers["user-agent"]);
        setRefreshCookie(res, result.refreshToken);
        return { token: result.token, user: result.user };
    }
    async signup(body, req, res) {
        const payload = (0, zod_2.parseBody)(signupSchema, body);
        const result = await this.auth.signupWithPassword(payload.email, payload.password, payload.name, clientIp(req), req.headers["user-agent"]);
        setRefreshCookie(res, result.refreshToken);
        return { token: result.token, user: result.user };
    }
    async google(body, req, res) {
        const payload = (0, zod_2.parseBody)(googleSchema, body);
        const result = await this.auth.loginWithGoogle(payload.idToken, clientIp(req), req.headers["user-agent"]);
        setRefreshCookie(res, result.refreshToken);
        return { token: result.token, user: result.user };
    }
    async refresh(req, res) {
        const result = await this.auth.refresh(req.cookies?.[env_1.env.refreshCookieName], clientIp(req), req.headers["user-agent"]);
        setRefreshCookie(res, result.refreshToken);
        return { token: result.token, user: result.user };
    }
    async logout(req, authorization, res) {
        const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
        await this.auth.logout(req.cookies?.[env_1.env.refreshCookieName], token, req.user?.id);
        res.clearCookie(env_1.env.refreshCookieName, { path: `${env_1.env.apiPrefix}/auth` });
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)("signup"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)("oauth/google"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "google", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)("refresh"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, decorators_1.AllowSuspended)(),
    (0, common_1.Post)("logout"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)("authorization")),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
function setRefreshCookie(res, refreshToken) {
    res.cookie(env_1.env.refreshCookieName, refreshToken, {
        httpOnly: true,
        secure: env_1.env.cookieSecure,
        sameSite: env_1.env.cookieSameSite,
        path: `${env_1.env.apiPrefix}/auth`,
        maxAge: env_1.env.refreshTokenExpireDays * 24 * 60 * 60 * 1000
    });
}
function clientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded)
        return forwarded.split(",")[0]?.trim() ?? "unknown";
    return req.ip || req.socket.remoteAddress || "unknown";
}
//# sourceMappingURL=auth.controller.js.map