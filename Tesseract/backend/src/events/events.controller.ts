import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { Public, Roles } from "../common/decorators";
import { parseBody } from "../common/zod";
import { EventsService } from "./events.service";

const speakerSchema = z.object({
  name: z.string().max(200),
  title: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  avatar: z.string().url().optional().nullable(),
  links: z.array(z.string().url()).max(10).optional()
}).passthrough();

const resourceSchema = z.object({
  title: z.string().max(200),
  url: z.string().url().optional(),
  type: z.string().max(50).optional()
}).passthrough();

const faqSchema = z.object({
  question: z.string().max(500),
  answer: z.string().max(5000)
}).passthrough();

const registrationFieldSchema = z.object({
  id: z.string().max(64).optional(),
  label: z.string().max(200),
  type: z.enum(["text", "number", "email", "select", "checkbox", "textarea"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).max(50).optional(),
  placeholder: z.string().max(200).optional(),
  maxLength: z.number().int().min(1).max(5000).optional()
}).passthrough();

const eventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  cover: z.string().url().optional().nullable(),
  category: z.enum(["hackathon", "quiz", "meetup", "workshop", "tournament", "social"]),
  status: z.enum(["upcoming", "live", "completed", "past", "cancelled"]).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().min(1).max(255),
  capacity: z.number().int().min(0),
  xpReward: z.number().int().min(0).optional(),
  organizers: z.array(z.string()).optional(),
  tags: z.array(z.string().max(40)).max(40).optional(),
  // Rich fields
  shortDescription: z.string().max(300).optional().nullable(),
  agenda: z.string().max(15000).optional().nullable(),
  highlights: z.string().max(15000).optional().nullable(),
  learningOutcomes: z.string().max(15000).optional().nullable(),
  targetAudience: z.string().max(5000).optional().nullable(),
  prerequisites: z.string().max(5000).optional().nullable(),
  speakers: z.array(speakerSchema).max(100).optional(),
  resources: z.array(resourceSchema).max(100).optional(),
  faqs: z.array(faqSchema).max(100).optional(),
  imageGallery: z.array(z.string().url()).max(50).optional(),
  videoUrl: z.string().url().optional().nullable(),
  venue: z.string().max(300).optional().nullable(),
  eventType: z.string().max(80).optional().nullable(),
  featured: z.boolean().optional(),
  allowLateRegistration: z.boolean().optional(),
  eventDays: z.number().int().min(1).max(10).optional(),
  dayLabels: z.array(z.string().max(100)).optional(),
  registrationFields: z.array(registrationFieldSchema).max(20).optional(),
  registrationStartDate: z.string().datetime().optional().nullable(),
  registrationEndDate: z.string().datetime().optional().nullable(),
  teamRegistration: z.boolean().optional(),
  teamMinSize: z.number().int().min(1).max(100).optional(),
  teamMaxSize: z.number().int().min(1).max(100).optional()
});

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Public()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request & { user?: { id: string } }) {
    return this.events.list(req.user?.id, query);
  }

  @Get(":id")
  @Public()
  async get(@Param("id") id: string, @Req() req: Request & { user?: { id: string } }) {
    return this.events.get(id, req.user?.id);
  }

  @Roles("core")
  @Post()
  async create(@Body() body: unknown, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    return this.events.create(parseBody(eventSchema, body), req.user);
  }

  @Roles("core")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    return this.events.update(id, parseBody(eventSchema.partial(), body), req.user);
  }

  @Roles("core")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: Request & { user: { id: string; role: "guest" | "member" | "core" | "admin" } }) {
    return this.events.remove(id, req.user);
  }



  @Roles("core")
  @Get(":id/participants")
  async participants(@Param("id") id: string) {
    return this.events.participants(id);
  }
}
