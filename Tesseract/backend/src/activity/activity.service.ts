import { Injectable } from "@nestjs/common";

import { AppError } from "../common/app-error";
import { paginationMeta, withMeta } from "../common/envelope";
import { parseQueryInt } from "../common/zod";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";

type NotificationKind = "info" | "success" | "warning" | "event" | "game";

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureService
  ) {}

  async log(input: {
    action: string;
    title: string;
    actorUserId?: string | null;
    subjectUserId?: string | null;
    description?: string | null;
    meta?: Record<string, unknown>;
    xpDelta?: number;
  }) {
    return this.prisma.activityLog.create({
      data: {
        action: input.action,
        title: input.title,
        actorUserId: input.actorUserId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        description: input.description ?? null,
        meta: (input.meta ?? {}) as any,
        xpDelta: input.xpDelta ?? 0
      }
    });
  }

  async notify(userId: string, title: string, body: string, kind: NotificationKind = "info", meta: Record<string, unknown> = {}) {
    const enabled = await this.features.isEnabledForUser(userId, "notifications.in_app_enabled");
    if (!enabled) return null;
    return this.prisma.notification.create({ data: { userId, title, body, kind, meta: meta as any } });
  }

  async listForUser(viewerId: string, viewerRole: string, query: Record<string, unknown>) {
    const requested = typeof query.user === "string" ? query.user : typeof query.userId === "string" ? query.userId : "me";
    const targetUserId = requested === "me" ? viewerId : requested;
    if (targetUserId !== viewerId && !["core", "admin"].includes(viewerRole)) {
      const flags = await this.features.resolveForUser(targetUserId);
      if (flags["activity.feed_visibility"] !== "public" && flags["activity.feed_visibility"] !== "members") {
        throw new AppError("forbidden", "You do not have access to this activity feed.", 403);
      }
    }
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size, 20, 1, 100);
    const where = {
      subjectUserId: targetUserId,
      ...(typeof query.type === "string" ? { action: query.type } : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.activityLog.count({ where })
    ]);
    return withMeta(
      items.map((item: { id: string; action: string; title: string; description: string | null; createdAt: Date; meta: unknown }) => ({
        id: item.id,
        type: item.action,
        title: item.title,
        description: item.description,
        at: item.createdAt,
        meta: item.meta
      })),
      paginationMeta(page, pageSize, total)
    );
  }

  async notifications(userId: string, query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size, 20, 1, 100);
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.notification.count({ where: { userId } })
    ]);
    return withMeta(
      items.map((item: { id: string; title: string; body: string; createdAt: Date; readAt: Date | null; kind: NotificationKind }) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        at: item.createdAt,
        read: item.readAt != null,
        kind: item.kind
      })),
      paginationMeta(page, pageSize, total)
    );
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new AppError("not_found", "Notification not found.", 404);
    await this.prisma.notification.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
    return { ok: true };
  }
}
