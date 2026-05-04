import { OnModuleDestroy } from "@nestjs/common";
export declare class CacheService implements OnModuleDestroy {
    private readonly logger;
    private readonly memory;
    private redis;
    private redisFailed;
    private backend;
    onModuleDestroy(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    setJson(key: string, value: unknown, ttlSeconds: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    incrementWithTtl(key: string, ttlSeconds: number): Promise<number>;
}
