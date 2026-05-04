import { Controller, Get } from "@nestjs/common";

import { Public } from "./common/decorators";
import { CacheService } from "./common/cache.service";
import { PrismaService } from "./prisma/prisma.service";

@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  @Get()
  async health() {
    return { ok: true, service: "tesseract-backend" };
  }

  @Get("ready")
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.cache.set("health:ready", "ok", 5);
    return { ok: true };
  }
}
