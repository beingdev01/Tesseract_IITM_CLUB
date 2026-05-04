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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const app_error_1 = require("../common/app-error");
const zod_2 = require("../common/zod");
const activity_service_1 = require("../activity/activity.service");
const user_service_1 = require("./user.service");
const updateMeSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(64).optional(),
    bio: zod_1.z.string().max(500).nullable().optional(),
    avatarUrl: zod_1.z.string().url().refine((value) => value.startsWith("https://"), "avatarUrl must be https").nullable().optional(),
    avatar: zod_1.z.string().url().refine((value) => value.startsWith("https://"), "avatar must be https").nullable().optional(),
    rollNumber: zod_1.z.string().regex(/^[A-Za-z0-9_-]{3,32}$/).nullable().optional(),
    phone: zod_1.z.string().trim().min(7).max(20).nullable().optional(),
    course: zod_1.z.string().trim().max(100).nullable().optional(),
    branch: zod_1.z.string().trim().max(100).nullable().optional(),
    year: zod_1.z.string().trim().max(10).nullable().optional()
});
let UsersController = class UsersController {
    users;
    activity;
    constructor(users, activity) {
        this.users = users;
        this.activity = activity;
    }
    async me(req) {
        const user = await this.users.mustGetById(req.user.id);
        return this.users.publicUser(user, { id: user.id, role: user.role });
    }
    async patchMe(body, req) {
        const payload = (0, zod_2.parseBody)(updateMeSchema, body);
        const { updated, changed } = await this.users.updateMe(req.user.id, {
            name: payload.name,
            bio: payload.bio,
            avatarUrl: payload.avatarUrl ?? payload.avatar,
            rollNumber: payload.rollNumber,
            phone: payload.phone,
            course: payload.course,
            branch: payload.branch,
            year: payload.year
        });
        if (changed) {
            await this.activity.log({
                action: "profile_update",
                title: "Updated profile",
                actorUserId: req.user.id,
                subjectUserId: req.user.id
            });
        }
        return this.users.publicUser(updated, { id: req.user.id, role: req.user.role });
    }
    async profile(id, req) {
        const user = await this.users.mustGetById(id);
        if (!(await this.users.canViewProfile(user, req.user))) {
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        }
        return this.users.publicUser(user, req.user);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, decorators_1.AllowSuspended)(),
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)("me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "patchMe", null);
__decorate([
    (0, decorators_1.Roles)("member"),
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "profile", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [user_service_1.UserService,
        activity_service_1.ActivityService])
], UsersController);
//# sourceMappingURL=users.controller.js.map