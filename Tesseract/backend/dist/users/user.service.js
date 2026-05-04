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
exports.UserService = void 0;
exports.levelForXp = levelForXp;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/app-error");
const types_1 = require("../common/types");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const levels = ["Bronze", "Silver", "Gold", "Platinum", "Diamond I", "Diamond II", "Diamond III", "Mythic I", "Mythic II", "Mythic III"];
function levelForXp(xp) {
    return levels[Math.min(Math.floor(xp / 5000), levels.length - 1)];
}
let UserService = class UserService {
    prisma;
    features;
    constructor(prisma, features) {
        this.prisma = prisma;
        this.features = features;
    }
    async getById(id) {
        return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    }
    async mustGetById(id) {
        const user = await this.getById(id);
        if (!user)
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        return user;
    }
    async publicUser(user, viewer) {
        const own = viewer?.id === user.id;
        const privileged = viewer ? (0, types_1.hasMinRole)(viewer.role, "core") : false;
        const [rank, latestRequest, flags] = await Promise.all([
            this.rankForUser(user),
            this.prisma.membershipRequest.findFirst({ where: { userId: user.id }, orderBy: { requestedAt: "desc" } }),
            this.features.resolveForUser(user.id)
        ]);
        const roleApproved = user.role !== "guest";
        const membershipStatus = roleApproved ? "approved" : latestRequest?.status ?? "none";
        return {
            id: user.id,
            name: user.name,
            email: own || privileged || flags["profile.show_email"] === true ? user.email : "",
            avatar: user.avatarUrl,
            role: user.role,
            rollNumber: own || privileged || flags["profile.show_roll_number"] === true ? user.rollNumber : undefined,
            level: user.level,
            joinedAt: user.joinedAt,
            xp: user.xp,
            rank,
            streak: user.streak,
            bio: user.bio,
            phone: own || privileged ? user.phone : undefined,
            course: user.course,
            branch: user.branch,
            year: user.year,
            profileCompleted: user.profileCompleted,
            badges: [],
            membershipStatus,
            membershipRequestedAt: latestRequest?.requestedAt ?? null
        };
    }
    async rankForUser(user) {
        const ahead = await this.prisma.user.count({
            where: {
                deletedAt: null,
                OR: [{ xp: { gt: user.xp } }, { xp: user.xp, joinedAt: { lt: user.joinedAt } }]
            }
        });
        return ahead + 1;
    }
    async updateMe(userId, patch) {
        const current = await this.mustGetById(userId);
        const fields = ["name", "bio", "avatarUrl", "rollNumber", "phone", "course", "branch", "year"];
        const changed = fields.some((key) => {
            return patch[key] !== undefined && patch[key] !== current[key];
        });
        const data = {};
        if (patch.name !== undefined)
            data.name = patch.name;
        if (patch.bio !== undefined)
            data.bio = patch.bio;
        if (patch.avatarUrl !== undefined)
            data.avatarUrl = patch.avatarUrl;
        if (patch.rollNumber !== undefined)
            data.rollNumber = patch.rollNumber;
        if (patch.phone !== undefined)
            data.phone = patch.phone;
        if (patch.course !== undefined)
            data.course = patch.course;
        if (patch.branch !== undefined)
            data.branch = patch.branch;
        if (patch.year !== undefined)
            data.year = patch.year;
        const merged = { ...current, ...data };
        data.profileCompleted = !!(merged.name && merged.rollNumber && merged.course && merged.branch && merged.year);
        const updated = await this.prisma.user.update({ where: { id: userId }, data });
        return { updated, changed };
    }
    async canViewProfile(target, viewer) {
        if (target.id === viewer.id || (0, types_1.hasMinRole)(viewer.role, "core"))
            return true;
        const flags = await this.features.resolveForUser(target.id);
        return flags["profile.visible_in_directory"] === true;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        feature_service_1.FeatureService])
], UserService);
//# sourceMappingURL=user.service.js.map