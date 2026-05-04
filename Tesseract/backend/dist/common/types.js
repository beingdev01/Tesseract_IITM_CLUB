"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleRank = void 0;
exports.hasMinRole = hasMinRole;
exports.roleRank = {
    guest: 0,
    member: 1,
    core: 2,
    admin: 3
};
function hasMinRole(actual, minimum) {
    return exports.roleRank[actual] >= exports.roleRank[minimum];
}
//# sourceMappingURL=types.js.map