import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
const FEATURE_FLAG_TTL_MS = 5 * 60 * 1000;
let cache = null;
let lastFetch = 0;
const DEFAULTS = {
    certificatesEnabled: true,
    attendanceEnabled: true,
};
export function invalidateFeatureFlagCache() {
    cache = null;
    lastFetch = 0;
}
export async function getFeatureFlags() {
    const now = Date.now();
    if (cache && now - lastFetch < FEATURE_FLAG_TTL_MS) {
        return cache;
    }
    try {
        const settings = await prisma.settings.findUnique({
            where: { id: 'default' },
            select: { certificatesEnabled: true, attendanceEnabled: true },
        });
        cache = {
            certificatesEnabled: settings?.certificatesEnabled ?? true,
            attendanceEnabled: settings?.attendanceEnabled ?? true,
        };
        lastFetch = now;
        return cache;
    }
    catch (error) {
        logger.error('Failed to fetch feature flags', {
            error: error instanceof Error ? error.message : String(error),
        });
        if (cache)
            return cache;
        return DEFAULTS;
    }
}
export const requireFeature = (feature) => {
    return (async (req, res, next) => {
        const flags = await getFeatureFlags();
        const enabled = feature === 'certificates' ? flags.certificatesEnabled : flags.attendanceEnabled;
        if (!enabled) {
            return ApiResponse.error(res, {
                code: 'FEATURE_DISABLED',
                message: `${feature} is currently disabled by an administrator`,
                status: 403,
                details: { feature },
            });
        }
        next();
    });
};
