import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { assertProductionSecrets, env } from "./config/env";
import { FeatureService } from "./features/feature.service";

async function bootstrap(): Promise<void> {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix(env.apiPrefix.replace(/^\//, ""));
  app.enableCors({
    origin: env.frontendOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "x-skip-auth-refresh"]
  });
  app.use(cookieParser());
  await app.get(FeatureService).ensureSeeded();
  await app.listen(env.port);
}

void bootstrap();
