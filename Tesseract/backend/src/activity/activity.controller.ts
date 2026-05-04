import { Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { ActivityService } from "./activity.service";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  async feed(@Query() query: Record<string, unknown>, @Req() req: Request & { user: { id: string; role: string } }) {
    return this.activity.listForUser(req.user.id, req.user.role, query);
  }

  @Get("notifications")
  async notifications(@Query() query: Record<string, unknown>, @Req() req: Request & { user: { id: string } }) {
    return this.activity.notifications(req.user.id, query);
  }

  @Post("notifications/:id/read")
  async markRead(@Param("id") id: string, @Req() req: Request & { user: { id: string } }) {
    return this.activity.markNotificationRead(id, req.user.id);
  }
}
