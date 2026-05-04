import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Public, Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { AnnouncementsService } from "./announcements.service";

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(10000),
  priority: z.number().int().min(0).max(100).optional(),
  pinned: z.boolean().optional()
});

@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @Public()
  async list(@Query() query: Record<string, unknown>) {
    return this.announcements.list(query);
  }

  @Get(":id")
  @Public()
  async get(@Param("id") id: string) {
    return this.announcements.get(id);
  }

  @Roles("core")
  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.announcements.create(parseBody(announcementSchema, body), req.user.id);
  }

  @Roles("core")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.announcements.update(id, parseBody(announcementSchema.partial(), body), req.user.id);
  }

  @Roles("core")
  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.announcements.remove(id, req.user.id);
  }
}
