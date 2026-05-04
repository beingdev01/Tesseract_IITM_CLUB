"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const zod_1 = require("../common/zod");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
let GamesService = class GamesService {
    prisma;
    features;
    activity;
    constructor(prisma, features, activity) {
        this.prisma = prisma;
        this.features = features;
        this.activity = activity;
    }
    async list(query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size, 20, 1, 100);
        const search = typeof query.query === "string" ? query.query : undefined;
        const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
        const [items, total] = await Promise.all([
            this.prisma.game.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { bestPlayer: true } }),
            this.prisma.game.count({ where })
        ]);
        return (0, envelope_1.withMeta)(items.map((item) => this.publicGame(item)), (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async get(id) {
        const game = await this.prisma.game.findUnique({ where: { id }, include: { bestPlayer: true } });
        if (!game)
            throw new app_error_1.AppError("not_found", "Game not found.", 404);
        return this.publicGame(game);
    }
    async create(payload, actor) {
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
    async update(id, patch, actor) {
        const game = await this.prisma.game.findUnique({ where: { id } });
        if (!game)
            throw new app_error_1.AppError("not_found", "Game not found.", 404);
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
    async remove(id, actor) {
        const game = await this.prisma.game.findUnique({ where: { id } });
        if (!game)
            throw new app_error_1.AppError("not_found", "Game not found.", 404);
        await this.prisma.game.delete({ where: { id } });
        await this.activity.log({ action: "game_delete", title: `Deleted game: ${game.name}`, actorUserId: actor.id, subjectUserId: actor.id, meta: { gameId: id } });
        return { ok: true };
    }
    async submitScore(id, score, user, idempotencyKey) {
        if (user.role === "guest")
            throw new app_error_1.AppError("forbidden", "Membership approval is required to submit scores.", 403);
        const enabled = await this.features.isEnabledForUser(user.id, "games.scores_enabled");
        if (!enabled)
            throw new app_error_1.AppError("phase_two", "Score submission is disabled for Phase 1.", 501);
        if (!idempotencyKey)
            throw new app_error_1.AppError("idempotency_key_required", "Idempotency-Key header is required.", 400);
        const game = await this.prisma.game.findUnique({ where: { id } });
        if (!game)
            throw new app_error_1.AppError("not_found", "Game not found.", 404);
        const existing = await this.prisma.gameScore.findUnique({ where: { userId_gameId_idempotencyKey: { userId: user.id, gameId: id, idempotencyKey } } });
        if (existing)
            return { rank: 0, personalBest: existing.isPersonalBest, xpAwarded: existing.xpAwarded };
        await this.prisma.gameScore.create({ data: { userId: user.id, gameId: id, score, idempotencyKey, isPersonalBest: false, xpAwarded: 0 } });
        return { rank: 0, personalBest: false, xpAwarded: 0 };
    }
    publicGame(game) {
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
};
exports.GamesService = GamesService;
exports.GamesService = GamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        feature_service_1.FeatureService,
        activity_service_1.ActivityService])
], GamesService);
//# sourceMappingURL=games.service.js.map