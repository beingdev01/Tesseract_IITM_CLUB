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
exports.LeaderboardController = void 0;
const common_1 = require("@nestjs/common");
const decorators_1 = require("../common/decorators");
const envelope_1 = require("../common/envelope");
const zod_1 = require("../common/zod");
const feature_service_1 = require("../features/feature.service");
let LeaderboardController = class LeaderboardController {
    features;
    constructor(features) {
        this.features = features;
    }
    async global(query, req) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size, 20, 1, 100);
        if (!req.user || !(await this.features.isEnabledForUser(req.user.id, "leaderboard.public_enabled"))) {
            return (0, envelope_1.withMeta)([], (0, envelope_1.paginationMeta)(page, pageSize, 0));
        }
        return (0, envelope_1.withMeta)([], (0, envelope_1.paginationMeta)(page, pageSize, 0));
    }
    async game(_gameId, query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size, 20, 1, 100);
        return (0, envelope_1.withMeta)([], (0, envelope_1.paginationMeta)(page, pageSize, 0));
    }
};
exports.LeaderboardController = LeaderboardController;
__decorate([
    (0, common_1.Get)("global"),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "global", null);
__decorate([
    (0, common_1.Get)("games/:gameId"),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Param)("gameId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "game", null);
exports.LeaderboardController = LeaderboardController = __decorate([
    (0, common_1.Controller)("leaderboard"),
    __metadata("design:paramtypes", [feature_service_1.FeatureService])
], LeaderboardController);
//# sourceMappingURL=leaderboard.controller.js.map