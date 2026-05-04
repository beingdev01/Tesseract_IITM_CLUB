"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.assertProductionSecrets = assertProductionSecrets;
require("dotenv/config");
const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/tesseract?schema=public";
process.env.DATABASE_URL ??= defaultDatabaseUrl;
function intEnv(key, fallback) {
    const raw = process.env[key];
    if (!raw)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function boolEnv(key, fallback) {
    const raw = process.env[key];
    if (raw == null || raw === "")
        return fallback;
    return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}
function listEnv(key, fallback) {
    const raw = process.env[key];
    if (!raw)
        return fallback;
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
}
exports.env = {
    appName: process.env.APP_NAME ?? "Tesseract API",
    appEnv: (process.env.APP_ENV ?? "development"),
    port: intEnv("PORT", 8000),
    apiPrefix: process.env.API_PREFIX ?? "/api/v1",
    frontendOrigins: listEnv("FRONTEND_ORIGINS", ["http://localhost:3000"]),
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/0",
    jwtSecret: process.env.JWT_SECRET ?? "change-me-dev-secret",
    accessTokenExpireMinutes: intEnv("ACCESS_TOKEN_EXPIRE_MINUTES", 15),
    refreshTokenExpireDays: intEnv("REFRESH_TOKEN_EXPIRE_DAYS", 14),
    otpExpireMinutes: intEnv("OTP_EXPIRE_MINUTES", 10),
    otpMaxAttempts: intEnv("OTP_MAX_ATTEMPTS", 5),
    otpPepper: process.env.OTP_PEPPER ?? "change-me-dev-pepper",
    otpRequestLimitPerIp: intEnv("OTP_REQUEST_LIMIT_PER_IP", 3),
    otpRequestLimitPerEmail: intEnv("OTP_REQUEST_LIMIT_PER_EMAIL", 5),
    otpVerifyLimitPerChallenge: intEnv("OTP_VERIFY_LIMIT_PER_CHALLENGE", 5),
    userRateLimitPerMinute: intEnv("USER_RATE_LIMIT_PER_MINUTE", 60),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? "tesseract_refresh",
    cookieSecure: boolEnv("COOKIE_SECURE", false),
    cookieSameSite: (process.env.COOKIE_SAMESITE ?? "lax"),
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@ds.study.iitm.ac.in",
    seedAdminName: process.env.SEED_ADMIN_NAME ?? "Tesseract Admin",
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "Dk261135@",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? ""
};
function assertProductionSecrets() {
    if (exports.env.appEnv !== "production")
        return;
    const placeholders = new Set(["change-me-dev-secret", "change-me-dev-pepper", "<CHANGE_ME>"]);
    if (placeholders.has(exports.env.jwtSecret) || exports.env.jwtSecret.length < 24) {
        throw new Error("JWT_SECRET must be strong in production.");
    }
    if (placeholders.has(exports.env.otpPepper) || exports.env.otpPepper.length < 24) {
        throw new Error("OTP_PEPPER must be strong in production.");
    }
    if (!exports.env.cookieSecure) {
        throw new Error("COOKIE_SECURE must be true in production.");
    }
}
//# sourceMappingURL=env.js.map