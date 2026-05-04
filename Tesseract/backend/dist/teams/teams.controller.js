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
exports.TeamsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const zod_2 = require("../common/zod");
const teams_service_1 = require("./teams.service");
const createTeamSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    teamName: zod_1.z.string().trim().min(1).max(100),
    customFieldResponses: zod_1.z.unknown().optional()
});
const joinTeamSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().length(8),
    customFieldResponses: zod_1.z.unknown().optional()
});
const lockSchema = zod_1.z.object({
    lock: zod_1.z.boolean()
});
let TeamsController = class TeamsController {
    teams;
    constructor(teams) {
        this.teams = teams;
    }
    async create(body, req) {
        const payload = (0, zod_2.parseBody)(createTeamSchema, body);
        return this.teams.createTeam(payload.eventId, req.user.id, payload.teamName, payload.customFieldResponses);
    }
    async join(body, req) {
        const payload = (0, zod_2.parseBody)(joinTeamSchema, body);
        return this.teams.joinTeam(req.user.id, payload.inviteCode, payload.customFieldResponses);
    }
    async myTeam(eventId, req) {
        return this.teams.myTeam(eventId, req.user.id);
    }
    async toggleLock(teamId, body, req) {
        const payload = (0, zod_2.parseBody)(lockSchema, body);
        return this.teams.toggleLock(teamId, req.user.id, payload.lock);
    }
    async dissolve(teamId, req) {
        return this.teams.dissolveTeam(teamId, req.user.id);
    }
    async removeMember(teamId, body, req) {
        const payload = (0, zod_2.parseBody)(zod_1.z.object({ userId: zod_1.z.string() }), body);
        return this.teams.removeMember(teamId, req.user.id, payload.userId);
    }
};
exports.TeamsController = TeamsController;
__decorate([
    (0, common_1.Post)("create"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("join"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "join", null);
__decorate([
    (0, common_1.Get)("my-team/:eventId"),
    __param(0, (0, common_1.Param)("eventId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "myTeam", null);
__decorate([
    (0, common_1.Patch)(":teamId/lock"),
    __param(0, (0, common_1.Param)("teamId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "toggleLock", null);
__decorate([
    (0, common_1.Post)(":teamId/dissolve"),
    __param(0, (0, common_1.Param)("teamId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "dissolve", null);
__decorate([
    (0, common_1.Post)(":teamId/remove-member"),
    __param(0, (0, common_1.Param)("teamId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TeamsController.prototype, "removeMember", null);
exports.TeamsController = TeamsController = __decorate([
    (0, common_1.Controller)("teams"),
    __metadata("design:paramtypes", [teams_service_1.TeamsService])
], TeamsController);
//# sourceMappingURL=teams.controller.js.map