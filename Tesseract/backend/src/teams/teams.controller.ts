import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { parseBody } from "../common/zod";
import { TeamsService } from "./teams.service";

const createTeamSchema = z.object({
  eventId: z.string().uuid(),
  teamName: z.string().trim().min(1).max(100),
  customFieldResponses: z.unknown().optional()
});

const joinTeamSchema = z.object({
  inviteCode: z.string().length(8),
  customFieldResponses: z.unknown().optional()
});

const lockSchema = z.object({
  lock: z.boolean()
});

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post("create")
  async create(
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    const payload = parseBody(createTeamSchema, body);
    return this.teams.createTeam(
      payload.eventId,
      req.user.id,
      payload.teamName,
      payload.customFieldResponses
    );
  }

  @Post("join")
  async join(
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    const payload = parseBody(joinTeamSchema, body);
    return this.teams.joinTeam(req.user.id, payload.inviteCode, payload.customFieldResponses);
  }

  @Get("my-team/:eventId")
  async myTeam(
    @Param("eventId") eventId: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.teams.myTeam(eventId, req.user.id);
  }

  @Patch(":teamId/lock")
  async toggleLock(
    @Param("teamId") teamId: string,
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    const payload = parseBody(lockSchema, body);
    return this.teams.toggleLock(teamId, req.user.id, payload.lock);
  }

  @Post(":teamId/dissolve")
  async dissolve(
    @Param("teamId") teamId: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.teams.dissolveTeam(teamId, req.user.id);
  }

  @Post(":teamId/remove-member")
  async removeMember(
    @Param("teamId") teamId: string,
    @Body() body: unknown,
    @Req() req: Request & { user: { id: string } }
  ) {
    const payload = parseBody(z.object({ userId: z.string() }), body);
    return this.teams.removeMember(teamId, req.user.id, payload.userId);
  }
}
