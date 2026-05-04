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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/app-error");
const cache_service_1 = require("../common/cache.service");
const prisma_service_1 = require("../prisma/prisma.service");
const feature_seeds_1 = require("./feature-seeds");
let FeatureService = class FeatureService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async ensureSeeded() {
        const count = await this.prisma.featureFlag.count();
        if (count > 0)
            return;
        await this.prisma.featureFlag.createMany({
            data: feature_seeds_1.featureSeeds.map((seed) => ({
                key: seed.key,
                displayName: seed.displayName,
                description: seed.description,
                category: seed.category,
                valueType: seed.valueType,
                defaultValue: seed.defaultValue
            }))
        });
    }
    async resolveForUser(userId) {
        const cacheKey = `features:user:${userId}`;
        const cached = await this.cache.getJson(cacheKey);
        if (cached)
            return cached;
        const [flags, overrides] = await Promise.all([
            this.prisma.featureFlag.findMany(),
            this.prisma.userFeatureOverride.findMany({ where: { userId } })
        ]);
        const resolved = {};
        for (const flag of flags)
            resolved[flag.key] = flag.defaultValue;
        for (const override of overrides)
            resolved[override.flagKey] = override.value;
        await this.cache.setJson(cacheKey, resolved, 60);
        return resolved;
    }
    async isEnabledForUser(userId, key) {
        const flags = await this.resolveForUser(userId);
        return flags[key] === true;
    }
    async getGlobalValue(key) {
        const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
        return flag ? flag.defaultValue : null;
    }
    async patchSelfPrefs(userId, patch) {
        const keys = Object.keys(patch);
        if (keys.length === 0)
            return this.resolveForUser(userId);
        const flags = await this.prisma.featureFlag.findMany({ where: { key: { in: keys } } });
        const userPrefFlags = flags.filter((flag) => flag.category === "user_pref");
        for (const flag of userPrefFlags) {
            const value = this.validateValue(flag, patch[flag.key]);
            await this.prisma.userFeatureOverride.upsert({
                where: { userId_flagKey: { userId, flagKey: flag.key } },
                update: { value, setById: userId, setAt: new Date(), reason: null },
                create: { userId, flagKey: flag.key, value, setById: userId }
            });
        }
        await this.cache.del(`features:user:${userId}`);
        return this.resolveForUser(userId);
    }
    async listFlags() {
        return this.prisma.featureFlag.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
    }
    async updateGlobalDefault(key, value) {
        const flag = await this.mustGetFlag(key);
        const defaultValue = this.validateValue(flag, value);
        const updated = await this.prisma.featureFlag.update({
            where: { key },
            data: { defaultValue }
        });
        await this.cache.deletePattern("features:user:*");
        return updated;
    }
    async overridesForFlag(key) {
        await this.mustGetFlag(key);
        return this.prisma.userFeatureOverride.findMany({
            where: { flagKey: key },
            orderBy: { setAt: "desc" }
        });
    }
    async detailForUser(userId) {
        const [flags, overrides, resolved] = await Promise.all([
            this.prisma.featureFlag.findMany(),
            this.prisma.userFeatureOverride.findMany({ where: { userId }, include: { setBy: true } }),
            this.resolveForUser(userId)
        ]);
        return {
            resolved,
            defaults: Object.fromEntries(flags.map((flag) => [flag.key, flag.defaultValue])),
            overrides: Object.fromEntries(overrides.map((override) => [
                override.flagKey,
                {
                    value: override.value,
                    setByName: override.setBy.name,
                    setAt: override.setAt,
                    reason: override.reason
                }
            ]))
        };
    }
    async setUserOverride(userId, flagKey, value, setById, reason) {
        const flag = await this.mustGetFlag(flagKey);
        const typedValue = this.validateValue(flag, value);
        const override = await this.prisma.userFeatureOverride.upsert({
            where: { userId_flagKey: { userId, flagKey } },
            update: { value: typedValue, setById, setAt: new Date(), reason: reason ?? null },
            create: { userId, flagKey, value: typedValue, setById, reason: reason ?? null }
        });
        await this.cache.del(`features:user:${userId}`);
        return override;
    }
    async removeUserOverride(userId, flagKey) {
        const existing = await this.prisma.userFeatureOverride.findUnique({
            where: { userId_flagKey: { userId, flagKey } }
        });
        if (!existing)
            return null;
        await this.prisma.userFeatureOverride.delete({ where: { userId_flagKey: { userId, flagKey } } });
        await this.cache.del(`features:user:${userId}`);
        return existing;
    }
    async mustGetFlag(key) {
        const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
        if (!flag)
            throw new app_error_1.AppError("not_found", "Feature flag not found.", 404);
        return flag;
    }
    validateValue(flag, value) {
        if (flag.valueType === "bool") {
            if (typeof value !== "boolean")
                throw new app_error_1.AppError("invalid_flag_value", "Flag value must be boolean.", 422);
            return value;
        }
        if (flag.valueType === "int") {
            if (!Number.isInteger(value))
                throw new app_error_1.AppError("invalid_flag_value", "Flag value must be integer.", 422);
            return value;
        }
        if (typeof value !== "string")
            throw new app_error_1.AppError("invalid_flag_value", "Flag value must be string.", 422);
        if (flag.key === "activity.feed_visibility" && !["public", "members", "private"].includes(value)) {
            throw new app_error_1.AppError("invalid_flag_value", "Invalid activity feed visibility.", 422);
        }
        return value;
    }
};
exports.FeatureService = FeatureService;
exports.FeatureService = FeatureService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], FeatureService);
//# sourceMappingURL=feature.service.js.map