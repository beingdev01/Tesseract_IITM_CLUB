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
exports.AnnouncementsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const announcements_service_1 = require("./announcements.service");
const announcementSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(255),
    content: zod_1.z.string().trim().min(1).max(10000),
    priority: zod_1.z.number().int().min(0).max(100).optional(),
    pinned: zod_1.z.boolean().optional()
});
let AnnouncementsController = class AnnouncementsController {
    announcements;
    constructor(announcements) {
        this.announcements = announcements;
    }
    async list(query) {
        return this.announcements.list(query);
    }
    async get(id) {
        return this.announcements.get(id);
    }
    async create(body, req) {
        return this.announcements.create((0, zod_2.parseBody)(announcementSchema, body), req.user.id);
    }
    async update(id, body, req) {
        return this.announcements.update(id, (0, zod_2.parseBody)(announcementSchema.partial(), body), req.user.id);
    }
    async remove(id, req) {
        return this.announcements.remove(id, req.user.id);
    }
};
exports.AnnouncementsController = AnnouncementsController;
__decorate([
    (0, common_1.Get)(),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "get", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "create", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "update", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "remove", null);
exports.AnnouncementsController = AnnouncementsController = __decorate([
    (0, common_1.Controller)("announcements"),
    __metadata("design:paramtypes", [announcements_service_1.AnnouncementsService])
], AnnouncementsController);
//# sourceMappingURL=announcements.controller.js.map