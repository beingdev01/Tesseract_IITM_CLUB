import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Public, Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { GamesService } from "./games.service";

const gameSchema = z.object({
  name: z.string().min(1).max(255),
  tagline: z.string().min(1).max(255),
  cover: z.string().url().nullable().optional(),
  emoji: z.string().min(1).max(16),
  category: z.string().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard", "nightmare"]),
  playersOnline: z.number().int().min(0).optional(),
  description: z.string().min(1),
  howToPlay: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  xpReward: z.number().int().min(0).optional()
});

@Controller("games")
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @Public()
  async list(@Query() query: Record<string, unknown>) {
    return this.games.list(query);
  }

  @Get(":id")
  @Public()
  async get(@Param("id") id: string) {
    return this.games.get(id);
  }

  @Roles("core")
  @Post()
  async create(@Body() body: unknown, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    return this.games.create(parseBody(gameSchema, body), req.user);
  }

  @Roles("core")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    return this.games.update(id, parseBody(gameSchema.partial(), body), req.user);
  }

  @Roles("core")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.games.remove(id, req.user);
  }

  @Post(":id/scores")
  async submitScore(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }
  ) {
    const payload = parseBody(z.object({ score: z.number().int().min(0) }), body);
    return this.games.submitScore(id, payload.score, req.user, idempotencyKey);
  }
}
