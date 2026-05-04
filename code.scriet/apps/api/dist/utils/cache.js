// In-memory cache with TTL support
import { logger } from './logger.js';
class Cache {
    store = new Map();
    cleanupInterval = null;
    constructor() {
        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    // Set a value with TTL in seconds
    set(key, value, ttlSeconds = 300) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.store.set(key, { value, expiresAt });
        logger.debug('Cache set', { key, ttlSeconds });
    }
    // Get a value from cache
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        logger.debug('Cache hit', { key });
        return entry.value;
    }
    // Check if key exists and is not expired
    has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    // Delete a specific key
    delete(key) {
        return this.store.delete(key);
    }
    // Delete keys matching a pattern
    deletePattern(pattern) {
        const regex = new RegExp(pattern);
        let deleted = 0;
        for (const key of this.store.keys()) {
            if (regex.test(key)) {
                this.store.delete(key);
                deleted++;
            }
        }
        logger.debug('Cache pattern delete', { pattern, deleted });
        return deleted;
    }
    // Clear all cache
    clear() {
        this.store.clear();
        logger.info('Cache cleared');
    }
    // Remove expired entries
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug('Cache cleanup', { entriesRemoved: cleaned });
        }
    }
    // Get cache stats
    stats() {
        return {
            size: this.store.size,
            keys: Array.from(this.store.keys()),
        };
    }
    // Get or set pattern - fetch from function if not in cache
    async getOrSet(key, fetcher, ttlSeconds = 300) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await fetcher();
        this.set(key, value, ttlSeconds);
        return value;
    }
    // Destroy the cache (cleanup interval)
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
    }
}
// Cache keys helpers
export const CacheKeys = {
    settings: () => 'settings:default',
    leaderboard: () => 'leaderboard:qotd',
    publicStats: () => 'stats:public',
    events: (status) => `events:${status || 'all'}`,
    event: (id) => `event:${id}`,
    team: () => 'team:all',
    achievements: () => 'achievements:all',
    announcements: (priority) => `announcements:${priority || 'all'}`,
    userProfile: (id) => `user:${id}`,
    userRegistrations: (id) => `user:${id}:registrations`,
    userStreak: (id) => `user:${id}:streak`,
};
// TTL presets in seconds
export const CacheTTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 900, // 15 minutes
    HOUR: 3600, // 1 hour
    DAY: 86400, // 24 hours
};
// Singleton instance
export const cache = new Cache();
