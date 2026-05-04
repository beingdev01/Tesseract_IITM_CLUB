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
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const cache_service_1 = require("./cache.service");
let IdempotencyInterceptor = class IdempotencyInterceptor {
    cache;
    constructor(cache) {
        this.cache = cache;
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        if (req.method !== "POST")
            return next.handle();
        const header = req.headers["idempotency-key"];
        const keyValue = Array.isArray(header) ? header[0] : header;
        if (!keyValue)
            return next.handle();
        const userOrIp = req.user?.id ?? req.ip ?? "anonymous";
        const cacheKey = `idempotency:${userOrIp}:${req.method}:${req.originalUrl}:${keyValue}`;
        return (0, rxjs_1.from)(this.cache.getJson(cacheKey)).pipe((0, rxjs_1.switchMap)((cached) => {
            if (cached)
                return (0, rxjs_1.of)(cached);
            return next.handle().pipe((0, rxjs_1.map)((value) => {
                const maybeEnvelope = value;
                const response = maybeEnvelope?.__envelope
                    ? { success: true, data: maybeEnvelope.data ?? null, error: null, meta: maybeEnvelope.meta ?? null }
                    : { success: true, data: value ?? null, error: null, meta: null };
                void this.cache.setJson(cacheKey, response, 24 * 60 * 60);
                return response;
            }));
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map