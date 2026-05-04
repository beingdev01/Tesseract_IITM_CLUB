"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInviteCode = generateInviteCode;
const crypto_1 = require("crypto");
function generateInviteCode() {
    return (0, crypto_1.randomBytes)(4).toString("hex").toUpperCase();
}
//# sourceMappingURL=invite-code.js.map