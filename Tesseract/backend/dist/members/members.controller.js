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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const members_service_1 = require("./members.service");
const requestSchema = zod_1.z.object({ note: zod_1.z.string().max(500).optional().nullable() });
let MembersController = class MembersController {
    members;
    constructor(members) {
        this.members = members;
    }
    async me(req) {
        return this.members.me(req.user.id, req.user.role);
    }
    async request(body, req) {
        const payload = (0, zod_2.parseBody)(requestSchema, body);
        return this.members.request(req.user.id, req.user.role, payload.note);
    }
    async directory(query, req) {
        return this.members.directory(req.user, query);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "me", null);
__decorate([
    (0, common_1.Post)("requests"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "request", null);
__decorate([
    (0, decorators_1.Roles)("admin"),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "directory", null);
exports.MembersController = MembersController = __decorate([
    (0, common_1.Controller)("members"),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map