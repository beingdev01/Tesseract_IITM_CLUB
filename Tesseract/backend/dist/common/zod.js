"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBody = parseBody;
exports.parseQueryInt = parseQueryInt;
const app_error_1 = require("./app-error");
function parseBody(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw new app_error_1.AppError("validation_error", "Invalid request body.", 422, {
            issues: parsed.error.issues
        });
    }
    return parsed.data;
}
function parseQueryInt(value, fallback, min, max) {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    const next = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(min, Math.min(max, next));
}
//# sourceMappingURL=zod.js.map