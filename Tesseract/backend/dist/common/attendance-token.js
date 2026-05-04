"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAttendanceToken = generateAttendanceToken;
exports.verifyAttendanceToken = verifyAttendanceToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function generateAttendanceToken(userId, eventId, registrationId) {
    return jsonwebtoken_1.default.sign({
        sub: userId,
        eventId,
        registrationId,
        purpose: "attendance"
    }, env_1.env.jwtSecret, { expiresIn: "90d" });
}
function verifyAttendanceToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
        if (payload.purpose !== "attendance")
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=attendance-token.js.map