import { Injectable } from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: unknown;
    after?: unknown;
    request?: Request;
    note?: string | null;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        before: toJson(input.before),
        after: toJson(input.after),
        ipAddress: clientIp(input.request),
        userAgent: input.request?.headers["user-agent"] ?? null,
        note: input.note ?? null
      }
    });
  }
}

export function toJson(value: unknown): any | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function clientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.ip || req.socket.remoteAddress || null;
}
