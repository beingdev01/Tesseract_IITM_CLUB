"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMeta = withMeta;
exports.paginationMeta = paginationMeta;
function withMeta(data, meta) {
    return { __envelope: true, data, meta };
}
function paginationMeta(page, pageSize, total) {
    return { page, pageSize, total, pages: Math.ceil(total / pageSize) || 1 };
}
//# sourceMappingURL=envelope.js.map