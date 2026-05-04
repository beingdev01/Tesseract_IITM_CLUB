import type { RequestHandler } from 'express';
export type Feature = 'certificates' | 'attendance';
interface FeatureFlags {
    certificatesEnabled: boolean;
    attendanceEnabled: boolean;
}
export declare function invalidateFeatureFlagCache(): void;
export declare function getFeatureFlags(): Promise<FeatureFlags>;
export declare const requireFeature: (feature: Feature) => RequestHandler;
export {};
