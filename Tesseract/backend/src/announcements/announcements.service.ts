import { Injectable } from "@nestjs/common";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { paginationMeta, withMeta } from "../common/envelope";
import { sanitizeHtml } from "../common/sanitize";
import { parseQueryInt } from "../common/zod";
import { PrismaService } from "../prisma/prisma.service";

type AnnouncementInput = {
  title: string;
  content: string;
  priority?: number;
  pinned?: boolean;
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  async list(query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size ?? query.limit, 20, 1, 100);

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { priority: "desc" }, { publishedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } }
        }
      }),
      this.prisma.announcement.count()
    ]);

    return withMeta(items, paginationMeta(page, pageSize, total));
  }

  async get(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    if (!announcement) throw new AppError("not_found", "Announcement not found.", 404);
    return announcement;
  }

  async create(payload: AnnouncementInput, actorId: string) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: payload.title,
        content: sanitizeHtml(payload.content) ?? payload.content,
        priority: payload.priority ?? 0,
        pinned: payload.pinned ?? false,
        createdById: actorId
      }
    });

    this.activity
      .log({
        action: "announcement_create",
        title: `Created announcement: ${announcement.title}`,
        actorUserId: actorId,
        subjectUserId: actorId,
        meta: { announcementId: announcement.id }
      })
      .catch(() => {});

    return announcement;
  }

  async update(id: string, patch: Partial<AnnouncementInput>, actorId: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new AppError("not_found", "Announcement not found.", 404);

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: sanitizeHtml(patch.content) ?? patch.content } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {})
      }
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new AppError("not_found", "Announcement not found.", 404);

    await this.prisma.announcement.delete({ where: { id } });

    this.activity
      .log({
        action: "announcement_delete",
        title: `Deleted announcement: ${existing.title}`,
        actorUserId: actorId,
        subjectUserId: actorId,
        meta: { announcementId: id }
      })
      .catch(() => {});

    return { ok: true };
  }
}
