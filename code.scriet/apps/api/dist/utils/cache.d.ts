declare class Cache {
    private store;
    private cleanupInterval;
    constructor();
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    get<T>(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): boolean;
    deletePattern(pattern: string): number;
    clear(): void;
    cleanup(): void;
    stats(): {
        size: number;
        keys: string[];
    };
    getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    destroy(): void;
}
export declare const CacheKeys: {
    settings: () => string;
    leaderboard: () => string;
    publicStats: () => string;
    events: (status?: string) => string;
    event: (id: string) => string;
    team: () => string;
    achievements: () => string;
    announcements: (priority?: string) => string;
    userProfile: (id: string) => string;
    userRegistrations: (id: string) => string;
    userStreak: (id: string) => string;
};
export declare const CacheTTL: {
    SHORT: number;
    MEDIUM: number;
    LONG: number;
    HOUR: number;
    DAY: number;
};
export declare const cache: Cache;
export {};
