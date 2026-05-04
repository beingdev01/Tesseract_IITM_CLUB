import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";
import { AuditService } from "./audit.service";

const roleSchema = z.object({ role: z.enum(["guest", "member", "core", "admin"]), reason: z.string().optional() });
const suspendSchema = z.object({ reason: z.string().min(1), expiresAt: z.string().datetime().optional() });
const noteSchema = z.object({ note: z.string().optional().nullable(), reviewerNote: z.string().optional().nullable() });
const rejectSchema = z.object({ note: z.string().min(1), reviewerNote: z.string().optional() });
const statusSchema = z.object({ status: z.enum(["upcoming", "live", "completed", "past", "cancelled"]) });
const flagDefaultSchema = z.object({ defaultValue: z.unknown() });
const flagOverrideSchema = z.object({ value: z.unknown(), reason: z.string().optional() });
const notificationSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  kind: z.enum(["info", "success", "warning", "event", "game"]),
  targetRole: z.enum(["all", "guest", "member", "core", "admin"]).optional()
});

@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly features: FeatureService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get("analytics")
  async analytics() {
    return this.admin.analytics();
  }

  @Get("users")
  async users(@Query() query: Record<string, unknown>, @Req() req: Request & { user: { id: string; role: "admin" } }) {
    return this.admin.listUsers(query, req.user);
  }

  @Get("users/:id/features")
  async userFeatures(@Param("id") id: string) {
    return this.features.detailForUser(id);
  }

  @Put("users/:id/features/:key")
  async setUserFeature(@Param("id") id: string, @Param("key") key: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(flagOverrideSchema, body);
    const before = await this.prisma.userFeatureOverride.findUnique({ where: { userId_flagKey: { userId: id, flagKey: key } } });
    const after = await this.features.setUserOverride(id, key, payload.value, req.user.id, payload.reason);
    await this.audit.log({ actorId: req.user.id, action: "flag.user.override.set", targetType: "flag", targetId: `${id}:${key}`, before, after, request: req, note: payload.reason });
    return after;
  }

  @Delete("users/:id/features/:key")
  async removeUserFeature(@Param("id") id: string, @Param("key") key: string, @Req() req: Request & { user: { id: string } }) {
    const before = await this.features.removeUserOverride(id, key);
    await this.audit.log({ actorId: req.user.id, action: "flag.user.override.remove", targetType: "flag", targetId: `${id}:${key}`, before, after: null, request: req });
    return { ok: true };
  }

  @Get("users/:id")
  async userDetail(@Param("id") id: string, @Req() req: Request & { user: { id: string; role: "admin" } }) {
    return this.admin.userDetail(id, req.user);
  }

  @Patch("users/:id")
  async updateUser(@Param("id") id: string, @Body() body: Record<string, unknown>, @Req() req: Request & { user: { id: string } }) {
    return this.admin.updateUser(id, body, req.user.id, req);
  }

  @Patch("users/:id/role")
  async setRole(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(roleSchema, body);
    return this.admin.setRole(id, payload.role, req.user.id, req, payload.reason);
  }

  @Post("users/:id/suspend")
  async suspend(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(suspendSchema, body);
    return this.admin.suspend(id, req.user.id, payload.reason, req, payload.expiresAt);
  }

  @Post("users/:id/unsuspend")
  async unsuspend(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.unsuspend(id, req.user.id, req);
  }

  @Post("users/:id/force-logout")
  async forceLogout(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.forceLogout(id, req.user.id, req);
  }

  @Post("users/:id/reset-otp-attempts")
  async resetOtp(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.resetOtpAttempts(id, req.user.id, req);
  }

  @Post("users/:id/verify-email")
  async verifyEmail(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.verifyEmail(id, req.user.id, req);
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.deleteUser(id, req.user.id, req);
  }

  @Get("membership-requests")
  async membershipRequests(@Query() query: Record<string, unknown>) {
    return this.admin.membershipRequests(query);
  }

  @Post("membership-requests/:id/approve")
  async approveMembership(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(noteSchema, body);
    return this.admin.approveMembership(id, req.user.id, req, payload.note ?? payload.reviewerNote);
  }

  @Post("membership-requests/:id/reject")
  async rejectMembership(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(rejectSchema, body);
    return this.admin.rejectMembership(id, req.user.id, req, payload.note || payload.reviewerNote || "");
  }

  @Post("events/:id/participants/:userId")
  async forceAddParticipant(@Param("id") id: string, @Param("userId") userId: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.forceAddParticipant(id, userId, req.user.id, req);
  }

  @Delete("events/:id/participants/:userId")
  async forceRemoveParticipant(@Param("id") id: string, @Param("userId") userId: string, @Req() req: Request & { user: { id: string } }) {
    return this.admin.forceRemoveParticipant(id, userId, req.user.id, req);
  }

  @Patch("events/:id/status")
  async setEventStatus(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(statusSchema, body);
    return this.admin.setEventStatus(id, payload.status, req.user.id, req);
  }

  @Get("features")
  async listFeatures() {
    return this.features.listFlags();
  }

  @Patch("features/:key")
  async updateFeature(@Param("key") key: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(flagDefaultSchema, body);
    const before = await this.prisma.featureFlag.findUnique({ where: { key } });
    const after = await this.features.updateGlobalDefault(key, payload.defaultValue);
    await this.audit.log({ actorId: req.user.id, action: "flag.global.update", targetType: "flag", targetId: key, before, after, request: req });
    return after;
  }

  @Get("features/:key/overrides")
  async featureOverrides(@Param("key") key: string) {
    return this.features.overridesForFlag(key);
  }

  @Post("notifications/broadcast")
  async broadcast(@Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    return this.admin.broadcastNotification(req.user.id, req, parseBody(notificationSchema, body));
  }

  @Post("notifications/user/:id")
  async notifyUser(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    const payload = parseBody(notificationSchema.omit({ targetRole: true }), body);
    return this.admin.notifyUser(req.user.id, id, req, payload);
  }

  @Get("stats/overview")
  async statsOverview() {
    return this.admin.statsOverview();
  }

  @Get("stats/signups-timeline")
  async signupsTimeline(@Query("days") daysRaw?: string) {
    const days = Number.parseInt(daysRaw ?? "30", 10) || 30;
    const rows = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 24 * 60 * 60_000);
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60_000);
      rows.push({
        date: start.toISOString().slice(0, 10),
        count: await this.prisma.user.count({ where: { joinedAt: { gte: start, lt: end } } })
      });
    }
    return rows;
  }

  @Get("audit-logs")
  async auditLogs(@Query() query: Record<string, unknown>) {
    return this.admin.auditLogs(query);
  }

  @Get("audit-logs/:id")
  async auditLog(@Param("id") id: string) {
    return this.prisma.adminAuditLog.findUniqueOrThrow({ where: { id } });
  }
}
