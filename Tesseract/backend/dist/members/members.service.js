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
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const zod_1 = require("../common/zod");
const prisma_service_1 = require("../prisma/prisma.service");
const user_service_1 = require("../users/user.service");
let MembersService = class MembersService {
    prisma;
    users;
    activity;
    constructor(prisma, users, activity) {
        this.prisma = prisma;
        this.users = users;
        this.activity = activity;
    }
    async me(userId, role) {
        const latest = await this.prisma.membershipRequest.findFirst({ where: { userId }, orderBy: { requestedAt: "desc" } });
        const status = role !== "guest" ? "approved" : latest?.status ?? "none";
        return {
            status,
            requestedAt: latest?.requestedAt ?? null,
            latestRequest: latest ? { id: latest.id, status: latest.status } : null
        };
    }
    async request(userId, role, note) {
        if (role !== "guest")
            throw new app_error_1.AppError("already_member", "User is already a member.", 409);
        const pending = await this.prisma.membershipRequest.findFirst({ where: { userId, status: "pending" } });
        if (pending)
            throw new app_error_1.AppError("already_pending", "A membership request is already pending.", 409);
        const request = await this.prisma.membershipRequest.create({ data: { userId, note: note ?? null } });
        await this.activity.log({
            action: "membership_request",
            title: "Requested Tesseract membership",
            actorUserId: userId,
            subjectUserId: userId,
            description: note ?? null
        });
        return { id: request.id, status: request.status };
    }
    async directory(viewer, query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const offset = (0, zod_1.parseQueryInt)(query.offset, (page - 1) * pageSize, 0, 1000000);
        const search = typeof query.search === "string" ? query.search : typeof query.query === "string" ? query.query : undefined;
        const roleRaw = typeof query.role === "string" ? query.role.trim().toLowerCase() : undefined;
        if (roleRaw && !["member", "core", "admin"].includes(roleRaw)) {
            throw new app_error_1.AppError("invalid_query", "Invalid role filter.", 422);
        }
        const role = roleRaw;
        const where = {
            deletedAt: null,
            ...(role ? { role } : { role: { in: ["member", "core", "admin"] } }),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { rollNumber: { contains: search, mode: "insensitive" } }
                    ]
                }
                : {})
        };
        const [rows, total] = await Promise.all([
            this.prisma.user.findMany({ where, orderBy: { joinedAt: "desc" }, skip: offset, take: pageSize }),
            this.prisma.user.count({ where })
        ]);
        return (0, envelope_1.withMeta)(await Promise.all(rows.map((user) => this.users.publicUser(user, viewer))), (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        user_service_1.UserService,
        activity_service_1.ActivityService])
], MembersService);
//# sourceMappingURL=members.service.js.map