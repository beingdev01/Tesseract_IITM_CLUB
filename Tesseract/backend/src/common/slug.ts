import { PrismaService } from "../prisma/prisma.service";

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export async function generateUniqueSlug(title: string, prisma: PrismaService, excludeId?: string): Promise<string> {
  const base = generateSlug(title);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true }
    });
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}
