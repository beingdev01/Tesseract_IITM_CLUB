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
exports.FeaturesController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const zod_2 = require("../common/zod");
const feature_service_1 = require("./feature.service");
const patchSchema = zod_1.z.record(zod_1.z.unknown());
let FeaturesController = class FeaturesController {
    features;
    constructor(features) {
        this.features = features;
    }
    async me(req) {
        return this.features.resolveForUser(req.user.id);
    }
    async patchMe(body, req) {
        return this.features.patchSelfPrefs(req.user.id, (0, zod_2.parseBody)(patchSchema, body));
    }
};
exports.FeaturesController = FeaturesController;
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)("me"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "patchMe", null);
exports.FeaturesController = FeaturesController = __decorate([
    (0, common_1.Controller)("features"),
    __metadata("design:paramtypes", [feature_service_1.FeatureService])
], FeaturesController);
//# sourceMappingURL=features.controller.js.map