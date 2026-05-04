import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { RegistrationsService } from "./registrations.service";

@Controller("registrations")
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post("events/:eventId")
  async register(
    @Param("eventId") eventId: string,
    @Body() body: { additionalFields?: unknown },
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.registrations.register(eventId, req.user.id, body?.additionalFields);
  }

  @Delete("events/:eventId")
  async unregister(
    @Param("eventId") eventId: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.registrations.unregister(eventId, req.user.id);
  }

  @Get("my")
  async myRegistrations(@Req() req: Request & { user: { id: string } }) {
    return this.registrations.myRegistrations(req.user.id);
  }

  @Get("events/:eventId/status")
  async status(
    @Param("eventId") eventId: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    return this.registrations.registrationStatus(eventId, req.user.id);
  }
}
