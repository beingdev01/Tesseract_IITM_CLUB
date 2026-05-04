"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
exports.generateUniqueSlug = generateUniqueSlug;
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 200);
}
async function generateUniqueSlug(title, prisma, excludeId) {
    const base = generateSlug(title);
    let slug = base;
    let counter = 1;
    while (true) {
        const existing = await prisma.event.findFirst({
            where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
            select: { id: true }
        });
        if (!existing)
            return slug;
        counter++;
        slug = `${base}-${counter}`;
    }
}
//# sourceMappingURL=slug.js.map