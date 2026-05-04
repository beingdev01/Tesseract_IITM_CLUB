"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvelopeInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let EnvelopeInterceptor = class EnvelopeInterceptor {
    intercept(_, next) {
        return next.handle().pipe((0, rxjs_1.map)((value) => {
            if (value &&
                typeof value === "object" &&
                "success" in value &&
                "data" in value &&
                "error" in value) {
                return value;
            }
            const maybeEnvelope = value;
            if (maybeEnvelope && maybeEnvelope.__envelope) {
                return {
                    success: true,
                    data: maybeEnvelope.data,
                    error: null,
                    meta: maybeEnvelope.meta ?? null
                };
            }
            return { success: true, data: value ?? null, error: null, meta: null };
        }));
    }
};
exports.EnvelopeInterceptor = EnvelopeInterceptor;
exports.EnvelopeInterceptor = EnvelopeInterceptor = __decorate([
    (0, common_1.Injectable)()
], EnvelopeInterceptor);
//# sourceMappingURL=envelope.interceptor.js.map