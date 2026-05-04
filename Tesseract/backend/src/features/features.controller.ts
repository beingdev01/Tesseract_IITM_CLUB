import { Body, Controller, Get, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { parseBody } from "../common/zod";
import { FeatureService } from "./feature.service";

const patchSchema = z.record(z.unknown());

@Controller("features")
export class FeaturesController {
  constructor(private readonly features: FeatureService) {}

  @Get("me")
  async me(@Req() req: Request & { user: { id: string } }) {
    return this.features.resolveForUser(req.user.id);
  }

  @Patch("me")
  async patchMe(@Body() body: unknown, @Req() req: Request & { user: { id: string } }) {
    return this.features.patchSelfPrefs(req.user.id, parseBody(patchSchema, body));
  }
}
