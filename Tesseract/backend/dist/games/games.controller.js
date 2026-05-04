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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const games_service_1 = require("./games.service");
const gameSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    tagline: zod_1.z.string().min(1).max(255),
    cover: zod_1.z.string().url().nullable().optional(),
    emoji: zod_1.z.string().min(1).max(16),
    category: zod_1.z.string().min(1).max(100),
    difficulty: zod_1.z.enum(["easy", "medium", "hard", "nightmare"]),
    playersOnline: zod_1.z.number().int().min(0).optional(),
    description: zod_1.z.string().min(1),
    howToPlay: zod_1.z.array(zod_1.z.string()).optional(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    xpReward: zod_1.z.number().int().min(0).optional()
});
let GamesController = class GamesController {
    games;
    constructor(games) {
        this.games = games;
    }
    async list(query) {
        return this.games.list(query);
    }
    async get(id) {
        return this.games.get(id);
    }
    async create(body, req) {
        return this.games.create((0, zod_2.parseBody)(gameSchema, body), req.user);
    }
    async update(id, body, req) {
        return this.games.update(id, (0, zod_2.parseBody)(gameSchema.partial(), body), req.user);
    }
    async remove(id, req) {
        return this.games.remove(id, req.user);
    }
    async submitScore(id, body, idempotencyKey, req) {
        const payload = (0, zod_2.parseBody)(zod_1.z.object({ score: zod_1.z.number().int().min(0) }), body);
        return this.games.submitScore(id, payload.score, req.user, idempotencyKey);
    }
};
exports.GamesController = GamesController;
__decorate([
    (0, common_1.Get)(),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "get", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "create", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "update", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(":id/scores"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)("idempotency-key")),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], GamesController.prototype, "submitScore", null);
exports.GamesController = GamesController = __decorate([
    (0, common_1.Controller)("games"),
    __metadata("design:paramtypes", [games_service_1.GamesService])
], GamesController);
//# sourceMappingURL=games.controller.js.map