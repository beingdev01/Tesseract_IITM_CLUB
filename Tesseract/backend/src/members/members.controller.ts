import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { MembersService } from "./members.service";

const requestSchema = z.object({ note: z.string().max(500).optional().nullable() });

@Controller("members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("me")
  async me(@Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    return this.members.me(req.user.id, req.user.role);
  }

  @Post("requests")
  async request(@Body() body: unknown, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    const payload = parseBody(requestSchema, body);
    return this.members.request(req.user.id, req.user.role, payload.note);
  }

  @Roles("admin")
  @Get()
  async directory(@Query() query: Record<string, unknown>, @Req() req: Request & { user: { id: string; role: "admin" } }) {
    return this.members.directory(req.user, query);
  }
}
