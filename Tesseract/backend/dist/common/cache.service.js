"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
let CacheService = CacheService_1 = class CacheService {
    logger = new common_1.Logger(CacheService_1.name);
    memory = new Map();
    redis = null;
    redisFailed = false;
    async backend() {
        if (this.redisFailed)
            return null;
        if (this.redis)
            return this.redis;
        try {
            const redis = new ioredis_1.default(env_1.env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
            await redis.connect();
            this.redis = redis;
            return redis;
        }
        catch {
            this.redisFailed = true;
            this.logger.warn("Redis unavailable; using in-memory cache fallback.");
            return null;
        }
    }
    async onModuleDestroy() {
        if (this.redis)
            await this.redis.quit();
    }
    async get(key) {
        const redis = await this.backend();
        if (redis)
            return redis.get(key);
        const item = this.memory.get(key);
        if (!item)
            return null;
        if (item.expiresAt && item.expiresAt < Date.now()) {
            this.memory.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds) {
        const redis = await this.backend();
        if (redis) {
            if (ttlSeconds)
                await redis.set(key, value, "EX", ttlSeconds);
            else
                await redis.set(key, value);
            return;
        }
        this.memory.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
        });
    }
    async getJson(key) {
        const raw = await this.get(key);
        return raw ? JSON.parse(raw) : null;
    }
    async setJson(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    async del(...keys) {
        if (keys.length === 0)
            return;
        const redis = await this.backend();
        if (redis) {
            await redis.del(...keys);
            return;
        }
        for (const key of keys)
            this.memory.delete(key);
    }
    async deletePattern(pattern) {
        const redis = await this.backend();
        if (redis) {
            const stream = redis.scanStream({ match: pattern, count: 100 });
            const keys = [];
            for await (const chunk of stream)
                keys.push(...chunk);
            if (keys.length)
                await redis.del(...keys);
            return;
        }
        const regex = new RegExp(`^${pattern.replaceAll("*", ".*")}$`);
        for (const key of this.memory.keys()) {
            if (regex.test(key))
                this.memory.delete(key);
        }
    }
    async incrementWithTtl(key, ttlSeconds) {
        const redis = await this.backend();
        if (redis) {
            const result = await redis.eval("local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count;", 1, key, ttlSeconds);
            return Number(result);
        }
        const current = Number(await this.get(key)) || 0;
        const next = current + 1;
        await this.set(key, String(next), ttlSeconds);
        return next;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)()
], CacheService);
//# sourceMappingURL=cache.service.js.map