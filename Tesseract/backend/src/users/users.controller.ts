import { Body, Controller, Get, Param, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { AllowSuspended, Roles } from "../common/decorators";
import { AppError } from "../common/app-error";
import { parseBody } from "../common/zod";
import { ActivityService } from "../activity/activity.service";
import { UserService } from "./user.service";

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().refine((value) => value.startsWith("https://"), "avatarUrl must be https").nullable().optional(),
  avatar: z.string().url().refine((value) => value.startsWith("https://"), "avatar must be https").nullable().optional(),
  rollNumber: z.string().regex(/^[A-Za-z0-9_-]{3,32}$/).nullable().optional(),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  course: z.string().trim().max(100).nullable().optional(),
  branch: z.string().trim().max(100).nullable().optional(),
  year: z.string().trim().max(10).nullable().optional()
});

@Controller("users")
export class UsersController {
  constructor(
    private readonly users: UserService,
    private readonly activity: ActivityService
  ) {}

  @AllowSuspended()
  @Get("me")
  async me(@Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    const user = await this.users.mustGetById(req.user.id);
    return this.users.publicUser(user, { id: user.id, role: user.role });
  }

  @Patch("me")
  async patchMe(@Body() body: unknown, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    const payload = parseBody(updateMeSchema, body);
    const { updated, changed } = await this.users.updateMe(req.user.id, {
      name: payload.name,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl ?? payload.avatar,
      rollNumber: payload.rollNumber,
      phone: payload.phone,
      course: payload.course,
      branch: payload.branch,
      year: payload.year
    });
    if (changed) {
      await this.activity.log({
        action: "profile_update",
        title: "Updated profile",
        actorUserId: req.user.id,
        subjectUserId: req.user.id
      });
    }
    return this.users.publicUser(updated, { id: req.user.id, role: req.user.role });
  }

  @Roles("member")
  @Get(":id")
  async profile(@Param("id") id: string, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    const user = await this.users.mustGetById(id);
    if (!(await this.users.canViewProfile(user, req.user))) {
      throw new AppError("not_found", "User not found.", 404);
    }
    return this.users.publicUser(user, req.user);
  }
}
