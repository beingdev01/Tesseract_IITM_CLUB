import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { InvitationsService } from "./invitations.service";

const createInvitationsSchema = z.object({
  eventId: z.string().uuid(),
  invitations: z.array(
    z.object({
      userId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      guestRole: z.enum(["CHIEF_GUEST", "SPEAKER", "JUDGE", "SPECIAL_GUEST"]),
      certificate: z.boolean().optional()
    })
  ).min(1).max(50)
});

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Roles("core")
  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    const payload = parseBody(createInvitationsSchema, body);
    return this.invitations.create(payload.eventId, payload.invitations, req.user.id);
  }

  @Post(":id/accept")
  async accept(
    @Param("id") id: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.invitations.accept(id, req.user.id);
  }

  @Post(":id/decline")
  async decline(
    @Param("id") id: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.invitations.decline(id, req.user.id);
  }

  @Get("my")
  async myInvitations(@Req() req: Request & { user: { id: string } }) {
    return this.invitations.myInvitations(req.user.id);
  }

  @Roles("core")
  @Get("events/:eventId")
  async eventInvitations(@Param("eventId") eventId: string) {
    return this.invitations.eventInvitations(eventId);
  }
}
