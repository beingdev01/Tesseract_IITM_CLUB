import { Injectable } from "@nestjs/common";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { paginationMeta, withMeta } from "../common/envelope";
import { parseQueryInt } from "../common/zod";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Role } from "../common/types";

type GameDifficulty = "easy" | "medium" | "hard" | "nightmare";

type GameInput = {
  name: string;
  tagline: string;
  cover?: string | null;
  emoji: string;
  category: string;
  difficulty: GameDifficulty;
  playersOnline?: number;
  description: string;
  howToPlay?: string[];
  rules?: string[];
  xpReward?: number;
};

export type GameAdapter = {
  validateScore(input: { score: number; userId: string; gameId: string }): Promise<{ valid: boolean; score: number }>;
  startSession(input: { userId: string; gameId: string }): Promise<unknown>;
  finishSession(input: { userId: string; gameId: string; sessionId: string }): Promise<unknown>;
};

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureService,
    private readonly activity: ActivityService
  ) {}

  async list(query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size, 20, 1, 100);
    const search = typeof query.query === "string" ? query.query : undefined;
    const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};
    const [items, total] = await Promise.all([
      this.prisma.game.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { bestPlayer: true } }),
      this.prisma.game.count({ where })
    ]);
    return withMeta(items.map((item: Parameters<GamesService["publicGame"]>[0]) => this.publicGame(item)), paginationMeta(page, pageSize, total));
  }

  async get(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id }, include: { bestPlayer: true } });
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    return this.publicGame(game);
  }

  async create(payload: GameInput, actor: { id: string; role: Role }) {
    const game = await this.prisma.game.create({
      data: {
        name: payload.name,
        tagline: payload.tagline,
        coverUrl: payload.cover,
        emoji: payload.emoji,
        category: payload.category,
        difficulty: payload.difficulty,
        playersOnline: payload.playersOnline ?? 0,
        description: payload.description,
        howToPlay: payload.howToPlay ?? [],
        rules: payload.rules ?? [],
        xpReward: payload.xpReward ?? 0,
        createdById: actor.id
      },
      include: { bestPlayer: true }
    });
    await this.activity.log({ action: "game_create", title: `Created game: ${game.name}`, actorUserId: actor.id, subjectUserId: actor.id, meta: { gameId: game.id } });
    return this.publicGame(game);
  }

  async update(id: string, patch: Partial<GameInput>, actor: { id: string }) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    const updated = await this.prisma.game.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
        ...(patch.cover !== undefined ? { coverUrl: patch.cover } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
        ...(patch.playersOnline !== undefined ? { playersOnline: patch.playersOnline } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.howToPlay !== undefined ? { howToPlay: patch.howToPlay } : {}),
        ...(patch.rules !== undefined ? { rules: patch.rules } : {}),
        ...(patch.xpReward !== undefined ? { xpReward: patch.xpReward } : {})
      },
      include: { bestPlayer: true }
    });
    await this.activity.log({ action: "game_update", title: `Updated game: ${updated.name}`, actorUserId: actor.id, subjectUserId: actor.id, meta: { gameId: id } });
    return this.publicGame(updated);
  }

  async remove(id: string, actor: { id: string }) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    await this.prisma.game.delete({ where: { id } });
    await this.activity.log({ action: "game_delete", title: `Deleted game: ${game.name}`, actorUserId: actor.id, subjectUserId: actor.id, meta: { gameId: id } });
    return { ok: true };
  }

  async submitScore(id: string, score: number, user: { id: string; role: Role }, idempotencyKey?: string) {
    if (user.role === "guest") throw new AppError("forbidden", "Membership approval is required to submit scores.", 403);
    const enabled = await this.features.isEnabledForUser(user.id, "games.scores_enabled");
    if (!enabled) throw new AppError("phase_two", "Score submission is disabled for Phase 1.", 501);
    if (!idempotencyKey) throw new AppError("idempotency_key_required", "Idempotency-Key header is required.", 400);
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new AppError("not_found", "Game not found.", 404);
    const existing = await this.prisma.gameScore.findUnique({ where: { userId_gameId_idempotencyKey: { userId: user.id, gameId: id, idempotencyKey } } });
    if (existing) return { rank: 0, personalBest: existing.isPersonalBest, xpAwarded: existing.xpAwarded };
    await this.prisma.gameScore.create({ data: { userId: user.id, gameId: id, score, idempotencyKey, isPersonalBest: false, xpAwarded: 0 } });
    return { rank: 0, personalBest: false, xpAwarded: 0 };
  }

  publicGame(game: { id: string; name: string; tagline: string; coverUrl: string | null; emoji: string; category: string; difficulty: GameDifficulty; playersOnline: number; highScore: number; bestPlayer?: { name: string } | null; description: string; howToPlay: unknown; rules: unknown; xpReward: number }) {
    return {
      id: game.id,
      name: game.name,
      tagline: game.tagline,
      cover: game.coverUrl,
      emoji: game.emoji,
      category: game.category,
      difficulty: game.difficulty,
      playersOnline: game.playersOnline,
      highScore: game.highScore,
      bestPlayer: game.bestPlayer?.name,
      description: game.description,
      howToPlay: Array.isArray(game.howToPlay) ? game.howToPlay : [],
      rules: Array.isArray(game.rules) ? game.rules : [],
      xpReward: game.xpReward
    };
  }
}
