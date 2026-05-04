"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorPayload = errorPayload;
const common_1 = require("@nestjs/common");
class AppError extends common_1.HttpException {
    code;
    details;
    constructor(code, message, status = common_1.HttpStatus.BAD_REQUEST, details) {
        super({ code, message, details }, status);
        this.code = code;
        this.details = details;
    }
}
exports.AppError = AppError;
function errorPayload(error) {
    if (error instanceof AppError) {
        return {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {})
        };
    }
    if (error instanceof common_1.HttpException) {
        const response = error.getResponse();
        if (typeof response === "object" && response !== null) {
            const value = response;
            return {
                code: typeof value.code === "string" ? value.code : "request_failed",
                message: typeof value.message === "string" ? value.message : error.message
            };
        }
        return { code: "request_failed", message: String(response) };
    }
    if (error instanceof Error)
        return { code: "internal_error", message: error.message };
    return { code: "internal_error", message: "Something went wrong." };
}
//# sourceMappingURL=app-error.js.map