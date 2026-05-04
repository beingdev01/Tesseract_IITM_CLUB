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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const events_service_1 = require("./events.service");
const speakerSchema = zod_1.z.object({
    name: zod_1.z.string().max(200),
    title: zod_1.z.string().max(200).optional(),
    bio: zod_1.z.string().max(2000).optional(),
    avatar: zod_1.z.string().url().optional().nullable(),
    links: zod_1.z.array(zod_1.z.string().url()).max(10).optional()
}).passthrough();
const resourceSchema = zod_1.z.object({
    title: zod_1.z.string().max(200),
    url: zod_1.z.string().url().optional(),
    type: zod_1.z.string().max(50).optional()
}).passthrough();
const faqSchema = zod_1.z.object({
    question: zod_1.z.string().max(500),
    answer: zod_1.z.string().max(5000)
}).passthrough();
const registrationFieldSchema = zod_1.z.object({
    id: zod_1.z.string().max(64).optional(),
    label: zod_1.z.string().max(200),
    type: zod_1.z.enum(["text", "number", "email", "select", "checkbox", "textarea"]),
    required: zod_1.z.boolean().optional(),
    options: zod_1.z.array(zod_1.z.string()).max(50).optional(),
    placeholder: zod_1.z.string().max(200).optional(),
    maxLength: zod_1.z.number().int().min(1).max(5000).optional()
}).passthrough();
const eventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().min(1),
    cover: zod_1.z.string().url().optional().nullable(),
    category: zod_1.z.enum(["hackathon", "quiz", "meetup", "workshop", "tournament", "social"]),
    status: zod_1.z.enum(["upcoming", "live", "completed", "past", "cancelled"]).optional(),
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
    location: zod_1.z.string().min(1).max(255),
    capacity: zod_1.z.number().int().min(0),
    xpReward: zod_1.z.number().int().min(0).optional(),
    organizers: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(40)).max(40).optional(),
    shortDescription: zod_1.z.string().max(300).optional().nullable(),
    agenda: zod_1.z.string().max(15000).optional().nullable(),
    highlights: zod_1.z.string().max(15000).optional().nullable(),
    learningOutcomes: zod_1.z.string().max(15000).optional().nullable(),
    targetAudience: zod_1.z.string().max(5000).optional().nullable(),
    prerequisites: zod_1.z.string().max(5000).optional().nullable(),
    speakers: zod_1.z.array(speakerSchema).max(100).optional(),
    resources: zod_1.z.array(resourceSchema).max(100).optional(),
    faqs: zod_1.z.array(faqSchema).max(100).optional(),
    imageGallery: zod_1.z.array(zod_1.z.string().url()).max(50).optional(),
    videoUrl: zod_1.z.string().url().optional().nullable(),
    venue: zod_1.z.string().max(300).optional().nullable(),
    eventType: zod_1.z.string().max(80).optional().nullable(),
    featured: zod_1.z.boolean().optional(),
    allowLateRegistration: zod_1.z.boolean().optional(),
    eventDays: zod_1.z.number().int().min(1).max(10).optional(),
    dayLabels: zod_1.z.array(zod_1.z.string().max(100)).optional(),
    registrationFields: zod_1.z.array(registrationFieldSchema).max(20).optional(),
    registrationStartDate: zod_1.z.string().datetime().optional().nullable(),
    registrationEndDate: zod_1.z.string().datetime().optional().nullable(),
    teamRegistration: zod_1.z.boolean().optional(),
    teamMinSize: zod_1.z.number().int().min(1).max(100).optional(),
    teamMaxSize: zod_1.z.number().int().min(1).max(100).optional()
});
let EventsController = class EventsController {
    events;
    constructor(events) {
        this.events = events;
    }
    async list(query, req) {
        return this.events.list(req.user?.id, query);
    }
    async get(id, req) {
        return this.events.get(id, req.user?.id);
    }
    async create(body, req) {
        return this.events.create((0, zod_2.parseBody)(eventSchema, body), req.user);
    }
    async update(id, body, req) {
        return this.events.update(id, (0, zod_2.parseBody)(eventSchema.partial(), body), req.user);
    }
    async remove(id, req) {
        return this.events.remove(id, req.user);
    }
    async participants(id) {
        return this.events.participants(id);
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Get)(),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "get", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "create", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "update", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "remove", null);
__decorate([
    (0, decorators_1.Roles)("core"),
    (0, common_1.Get)(":id/participants"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "participants", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)("events"),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map