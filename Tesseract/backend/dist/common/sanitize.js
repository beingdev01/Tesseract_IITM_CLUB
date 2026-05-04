"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
const ALLOWED_TAGS = new Set([
    "p", "br", "b", "i", "u", "em", "strong", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "hr", "span", "div"
]);
const DANGEROUS_PATTERN = /<script[\s>]|<iframe[\s>]|<object[\s>]|<embed[\s>]|<form[\s>]|javascript:/gi;
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=/gi;
function sanitizeHtml(input) {
    if (input == null || input === "")
        return null;
    let result = input;
    result = result.replace(DANGEROUS_PATTERN, "");
    result = result.replace(EVENT_HANDLER_PATTERN, " ");
    return result.trim() || null;
}
//# sourceMappingURL=sanitize.js.map