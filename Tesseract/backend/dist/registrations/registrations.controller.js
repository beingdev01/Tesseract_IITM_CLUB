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
exports.RegistrationsController = void 0;
const common_1 = require("@nestjs/common");
const registrations_service_1 = require("./registrations.service");
let RegistrationsController = class RegistrationsController {
    registrations;
    constructor(registrations) {
        this.registrations = registrations;
    }
    async register(eventId, body, req) {
        return this.registrations.register(eventId, req.user.id, body?.additionalFields);
    }
    async unregister(eventId, req) {
        return this.registrations.unregister(eventId, req.user.id);
    }
    async myRegistrations(req) {
        return this.registrations.myRegistrations(req.user.id);
    }
    async status(eventId, req) {
        return this.registrations.registrationStatus(eventId, req.user.id);
    }
};
exports.RegistrationsController = RegistrationsController;
__decorate([
    (0, common_1.Post)("events/:eventId"),
    __param(0, (0, common_1.Param)("eventId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RegistrationsController.prototype, "register", null);
__decorate([
    (0, common_1.Delete)("events/:eventId"),
    __param(0, (0, common_1.Param)("eventId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RegistrationsController.prototype, "unregister", null);
__decorate([
    (0, common_1.Get)("my"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrationsController.prototype, "myRegistrations", null);
__decorate([
    (0, common_1.Get)("events/:eventId/status"),
    __param(0, (0, common_1.Param)("eventId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RegistrationsController.prototype, "status", null);
exports.RegistrationsController = RegistrationsController = __decorate([
    (0, common_1.Controller)("registrations"),
    __metadata("design:paramtypes", [registrations_service_1.RegistrationsService])
], RegistrationsController);
//# sourceMappingURL=registrations.controller.js.map