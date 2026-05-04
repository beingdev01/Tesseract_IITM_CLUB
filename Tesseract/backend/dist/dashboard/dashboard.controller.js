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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const decorators_1 = require("../common/decorators");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardController = class DashboardController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async stats(req) {
        const [eventsJoined, gamesPlayed, user] = await Promise.all([
            this.prisma.eventParticipant.count({ where: { userId: req.user.id } }),
            this.prisma.gameScore.count({ where: { userId: req.user.id } }),
            this.prisma.user.findUnique({ where: { id: req.user.id } })
        ]);
        return {
            eventsJoined,
            gamesPlayed,
            totalXP: user?.xp ?? 0,
            streak: user?.streak ?? 0,
            rank: 0,
            weeklyXP: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, xp: 0 }))
        };
    }
    async publicSummary() {
        const [totalUsers, totalGames, activeEvents, liveGames] = await Promise.all([
            this.prisma.user.count({ where: { verifiedAt: { not: null }, deletedAt: null } }),
            this.prisma.game.count(),
            this.prisma.event.count({ where: { status: { in: ["upcoming", "live"] } } }),
            this.prisma.game.findMany({ orderBy: { playersOnline: "desc" }, take: 3 })
        ]);
        return {
            totalUsers,
            totalGames,
            activeEvents,
            liveGames: liveGames.map((game) => ({ id: game.id, name: game.name, emoji: game.emoji, playersOnline: game.playersOnline })),
            topPlayers: []
        };
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)("stats"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "stats", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)("public"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "publicSummary", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)("dashboard"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map