import { Injectable } from "@nestjs/common";

import { AppError } from "../common/app-error";
import { CacheService } from "../common/cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { featureSeeds } from "./feature-seeds";

type FlagValue = boolean | number | string;
type FeatureFlagLike = { key: string; valueType: "bool" | "int" | "string" };
type UserFeatureOverrideLike = { id: string; userId: string; flagKey: string; value: unknown; setById: string; setAt: Date; reason: string | null };

@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  async ensureSeeded(): Promise<void> {
    const count = await this.prisma.featureFlag.count();
    if (count > 0) return;
    await this.prisma.featureFlag.createMany({
      data: featureSeeds.map((seed) => ({
        key: seed.key,
        displayName: seed.displayName,
        description: seed.description,
        category: seed.category,
        valueType: seed.valueType,
        defaultValue: seed.defaultValue
      }))
    });
  }

  async resolveForUser(userId: string): Promise<Record<string, FlagValue>> {
    const cacheKey = `features:user:${userId}`;
    const cached = await this.cache.getJson<Record<string, FlagValue>>(cacheKey);
    if (cached) return cached;
    const [flags, overrides] = await Promise.all([
      this.prisma.featureFlag.findMany(),
      this.prisma.userFeatureOverride.findMany({ where: { userId } })
    ]);
    const resolved: Record<string, FlagValue> = {};
    for (const flag of flags) resolved[flag.key] = flag.defaultValue as FlagValue;
    for (const override of overrides) resolved[override.flagKey] = override.value as FlagValue;
    await this.cache.setJson(cacheKey, resolved, 60);
    return resolved;
  }

  async isEnabledForUser(userId: string, key: string): Promise<boolean> {
    const flags = await this.resolveForUser(userId);
    return flags[key] === true;
  }

  async getGlobalValue(key: string): Promise<FlagValue | null> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return flag ? (flag.defaultValue as FlagValue) : null;
  }

  async patchSelfPrefs(userId: string, patch: Record<string, unknown>): Promise<Record<string, FlagValue>> {
    const keys = Object.keys(patch);
    if (keys.length === 0) return this.resolveForUser(userId);
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

  async updateGlobalDefault(key: string, value: unknown) {
    const flag = await this.mustGetFlag(key);
    const defaultValue = this.validateValue(flag, value);
    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: { defaultValue }
    });
    await this.cache.deletePattern("features:user:*");
    return updated;
  }

  async overridesForFlag(key: string) {
    await this.mustGetFlag(key);
    return this.prisma.userFeatureOverride.findMany({
      where: { flagKey: key },
      orderBy: { setAt: "desc" }
    });
  }

  async detailForUser(userId: string): Promise<{
    resolved: Record<string, FlagValue>;
    defaults: Record<string, FlagValue>;
    overrides: Record<string, { value: FlagValue; setByName: string; setAt: Date; reason: string | null }>;
  }> {
    const [flags, overrides, resolved] = await Promise.all([
      this.prisma.featureFlag.findMany(),
      this.prisma.userFeatureOverride.findMany({ where: { userId }, include: { setBy: true } }),
      this.resolveForUser(userId)
    ]);
    return {
      resolved,
      defaults: Object.fromEntries(flags.map((flag) => [flag.key, flag.defaultValue as FlagValue])),
      overrides: Object.fromEntries(
        overrides.map((override) => [
          override.flagKey,
          {
            value: override.value as FlagValue,
            setByName: override.setBy.name,
            setAt: override.setAt,
            reason: override.reason
          }
        ])
      )
    };
  }

  async setUserOverride(
    userId: string,
    flagKey: string,
    value: unknown,
    setById: string,
    reason?: string
  ) {
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

  async removeUserOverride(userId: string, flagKey: string): Promise<UserFeatureOverrideLike | null> {
    const existing = await this.prisma.userFeatureOverride.findUnique({
      where: { userId_flagKey: { userId, flagKey } }
    });
    if (!existing) return null;
    await this.prisma.userFeatureOverride.delete({ where: { userId_flagKey: { userId, flagKey } } });
    await this.cache.del(`features:user:${userId}`);
    return existing;
  }

  private async mustGetFlag(key: string): Promise<FeatureFlagLike> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new AppError("not_found", "Feature flag not found.", 404);
    return flag;
  }

  private validateValue(flag: FeatureFlagLike, value: unknown): boolean | number | string {
    if (flag.valueType === "bool") {
      if (typeof value !== "boolean") throw new AppError("invalid_flag_value", "Flag value must be boolean.", 422);
      return value;
    }
    if (flag.valueType === "int") {
      if (!Number.isInteger(value)) throw new AppError("invalid_flag_value", "Flag value must be integer.", 422);
      return value as number;
    }
    if (typeof value !== "string") throw new AppError("invalid_flag_value", "Flag value must be string.", 422);
    if (flag.key === "activity.feed_visibility" && !["public", "members", "private"].includes(value)) {
      throw new AppError("invalid_flag_value", "Invalid activity feed visibility.", 422);
    }
    return value;
  }
}
