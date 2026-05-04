import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { Public } from "../common/decorators";
import { paginationMeta, withMeta } from "../common/envelope";
import { parseQueryInt } from "../common/zod";
import { FeatureService } from "../features/feature.service";

@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly features: FeatureService) {}

  @Get("global")
  @Public()
  async global(@Query() query: Record<string, unknown>, @Req() req: Request & { user?: { id: string } }) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size, 20, 1, 100);
    if (!req.user || !(await this.features.isEnabledForUser(req.user.id, "leaderboard.public_enabled"))) {
      return withMeta([], paginationMeta(page, pageSize, 0));
    }
    return withMeta([], paginationMeta(page, pageSize, 0));
  }

  @Get("games/:gameId")
  @Public()
  async game(@Param("gameId") _gameId: string, @Query() query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size, 20, 1, 100);
    return withMeta([], paginationMeta(page, pageSize, 0));
  }
}
