import { Injectable } from "@nestjs/common";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { paginationMeta, withMeta } from "../common/envelope";
import { parseQueryInt } from "../common/zod";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../users/user.service";
import type { Role } from "../common/types";

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserService,
    private readonly activity: ActivityService
  ) {}

  async me(userId: string, role: Role) {
    const latest = await this.prisma.membershipRequest.findFirst({ where: { userId }, orderBy: { requestedAt: "desc" } });
    const status = role !== "guest" ? "approved" : latest?.status ?? "none";
    return {
      status,
      requestedAt: latest?.requestedAt ?? null,
      latestRequest: latest ? { id: latest.id, status: latest.status } : null
    };
  }

  async request(userId: string, role: Role, note?: string | null) {
    if (role !== "guest") throw new AppError("already_member", "User is already a member.", 409);
    const pending = await this.prisma.membershipRequest.findFirst({ where: { userId, status: "pending" } });
    if (pending) throw new AppError("already_pending", "A membership request is already pending.", 409);
    const request = await this.prisma.membershipRequest.create({ data: { userId, note: note ?? null } });
    await this.activity.log({
      action: "membership_request",
      title: "Requested Tesseract membership",
      actorUserId: userId,
      subjectUserId: userId,
      description: note ?? null
    });
    return { id: request.id, status: request.status };
  }

  async directory(viewer: { id: string; role: Role }, query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size ?? query.limit, 20, 1, 100);
    const offset = parseQueryInt(query.offset, (page - 1) * pageSize, 0, 1000000);
    const search = typeof query.search === "string" ? query.search : typeof query.query === "string" ? query.query : undefined;
    const roleRaw = typeof query.role === "string" ? query.role.trim().toLowerCase() : undefined;
    if (roleRaw && !["member", "core", "admin"].includes(roleRaw)) {
      throw new AppError("invalid_query", "Invalid role filter.", 422);
    }
    const role = roleRaw as "member" | "core" | "admin" | undefined;
    const where = {
      deletedAt: null,
      ...(role ? { role } : { role: { in: ["member", "core", "admin"] as Role[] } }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { rollNumber: { contains: search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { joinedAt: "desc" }, skip: offset, take: pageSize }),
      this.prisma.user.count({ where })
    ]);
    return withMeta(await Promise.all(rows.map((user) => this.users.publicUser(user, viewer))), paginationMeta(page, pageSize, total));
  }
}
