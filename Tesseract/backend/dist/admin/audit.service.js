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
exports.AuditService = void 0;
exports.toJson = toJson;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input) {
        return this.prisma.adminAuditLog.create({
            data: {
                actorId: input.actorId,
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId,
                before: toJson(input.before),
                after: toJson(input.after),
                ipAddress: clientIp(input.request),
                userAgent: input.request?.headers["user-agent"] ?? null,
                note: input.note ?? null
            }
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
function toJson(value) {
    if (value === undefined)
        return undefined;
    return JSON.parse(JSON.stringify(value));
}
function clientIp(req) {
    if (!req)
        return null;
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded)
        return forwarded.split(",")[0]?.trim() ?? null;
    return req.ip || req.socket.remoteAddress || null;
}
//# sourceMappingURL=audit.service.js.map