import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

import { env } from "../config/env";

type Entry = { value: string; expiresAt: number | null };

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, Entry>();
  private redis: Redis | null = null;
  private redisFailed = false;

  private async backend(): Promise<Redis | null> {
    if (this.redisFailed) return null;
    if (this.redis) return this.redis;
    try {
      const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect();
      this.redis = redis;
      return redis;
    } catch {
      this.redisFailed = true;
      this.logger.warn("Redis unavailable; using in-memory cache fallback.");
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    const redis = await this.backend();
    if (redis) return redis.get(key);
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const redis = await this.backend();
    if (redis) {
      if (ttlSeconds) await redis.set(key, value, "EX", ttlSeconds);
      else await redis.set(key, value);
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const redis = await this.backend();
    if (redis) {
      await redis.del(...keys);
      return;
    }
    for (const key of keys) this.memory.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const redis = await this.backend();
    if (redis) {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];
      for await (const chunk of stream) keys.push(...(chunk as string[]));
      if (keys.length) await redis.del(...keys);
      return;
    }
    const regex = new RegExp(`^${pattern.replaceAll("*", ".*")}$`);
    for (const key of this.memory.keys()) {
      if (regex.test(key)) this.memory.delete(key);
    }
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const redis = await this.backend();
    if (redis) {
      const result = await redis.eval(
        "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count;",
        1,
        key,
        ttlSeconds
      );
      return Number(result);
    }
    const current = Number(await this.get(key)) || 0;
    const next = current + 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }
}
