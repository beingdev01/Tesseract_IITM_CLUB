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
exports.InvitationsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const invitations_service_1 = require("./invitations.service");
const createInvitationsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    invitations: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string().uuid().optional(),
        email: zod_1.z.string().email().optional(),
        guestRole: zod_1.z.enum(["CHIEF_GUEST", "SPEAKER", "JUDGE", "SPECIAL_GUEST"]),
        certificate: zod_1.z.boolean().optional()
    })).min(1).max(50)
});
let InvitationsController = class InvitationsController {
    invitations;
    constructor(invitations) {
        this.invitations = invitations;
    }
    async create(body, req) {
        const payload = (0, zod_2.parseBody)(createInvitationsSchema, body);
        return this.invitations.create(payload.eventId, payload.invitations, req.user.id);
    }
    async accept(id, req) {
        return this.invitations.accept(id, req.user.id);
    }
    async decline(id, req) {
        return this.invitations.decline(id, req.user.id);
    }
    async myInvitations(req) {
        return this.invitations.myInvitations(req.user.id);
    }
    async eventInvitations(eventId) {
        return this.invitations.eventInvitations(eventId);
    }
};
exports.InvitationsController = InvitationsController;
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(":id/accept"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(":id/decline"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "decline", null);
__decorate([
    (0, common_1.Get)("my"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "myInvitations", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Get)("events/:eventId"),
    __param(0, (0, common_1.Param)("eventId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "eventInvitations", null);
exports.InvitationsController = InvitationsController = __decorate([
    (0, common_1.Controller)("invitations"),
    __metadata("design:paramtypes", [invitations_service_1.InvitationsService])
], InvitationsController);
//# sourceMappingURL=invitations.controller.js.map