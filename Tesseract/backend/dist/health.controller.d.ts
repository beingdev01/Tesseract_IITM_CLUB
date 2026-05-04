import { CacheService } from "./common/cache.service";
import { PrismaService } from "./prisma/prisma.service";
export declare class HealthController {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    health(): Promise<{
        ok: boolean;
        service: string;
    }>;
    ready(): Promise<{
        ok: boolean;
    }>;
}
