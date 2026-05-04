import { CacheService } from "../common/cache.service";
import { PrismaService } from "../prisma/prisma.service";
type FlagValue = boolean | number | string;
type UserFeatureOverrideLike = {
    id: string;
    userId: string;
    flagKey: string;
    value: unknown;
    setById: string;
    setAt: Date;
    reason: string | null;
};
export declare class FeatureService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    ensureSeeded(): Promise<void>;
    resolveForUser(userId: string): Promise<Record<string, FlagValue>>;
    isEnabledForUser(userId: string, key: string): Promise<boolean>;
    getGlobalValue(key: string): Promise<FlagValue | null>;
    patchSelfPrefs(userId: string, patch: Record<string, unknown>): Promise<Record<string, FlagValue>>;
    listFlags(): Promise<{
        id: string;
        key: string;
        displayName: string;
        description: string | null;
        category: import(".prisma/client").$Enums.FlagCategory;
        valueType: import(".prisma/client").$Enums.FlagValueType;
        defaultValue: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateGlobalDefault(key: string, value: unknown): Promise<{
        id: string;
        key: string;
        displayName: string;
        description: string | null;
        category: import(".prisma/client").$Enums.FlagCategory;
        valueType: import(".prisma/client").$Enums.FlagValueType;
        defaultValue: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    overridesForFlag(key: string): Promise<{
        id: string;
        userId: string;
        flagKey: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        setById: string;
        setAt: Date;
        reason: string | null;
    }[]>;
    detailForUser(userId: string): Promise<{
        resolved: Record<string, FlagValue>;
        defaults: Record<string, FlagValue>;
        overrides: Record<string, {
            value: FlagValue;
            setByName: string;
            setAt: Date;
            reason: string | null;
        }>;
    }>;
    setUserOverride(userId: string, flagKey: string, value: unknown, setById: string, reason?: string): Promise<{
        id: string;
        userId: string;
        flagKey: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        setById: string;
        setAt: Date;
        reason: string | null;
    }>;
    removeUserOverride(userId: string, flagKey: string): Promise<UserFeatureOverrideLike | null>;
    private mustGetFlag;
    private validateValue;
}
export {};
