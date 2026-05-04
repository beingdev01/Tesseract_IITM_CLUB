import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { map, Observable, from, of, switchMap } from "rxjs";

import { CacheService } from "./cache.service";
import type { EnvelopeResult } from "./envelope";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    if (req.method !== "POST") return next.handle();
    const header = req.headers["idempotency-key"];
    const keyValue = Array.isArray(header) ? header[0] : header;
    if (!keyValue) return next.handle();
    const userOrIp = req.user?.id ?? req.ip ?? "anonymous";
    const cacheKey = `idempotency:${userOrIp}:${req.method}:${req.originalUrl}:${keyValue}`;
    return from(this.cache.getJson<unknown>(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) return of(cached);
        return next.handle().pipe(
          map((value: unknown) => {
            const maybeEnvelope = value as Partial<EnvelopeResult<unknown>>;
            const response = maybeEnvelope?.__envelope
              ? { success: true, data: maybeEnvelope.data ?? null, error: null, meta: maybeEnvelope.meta ?? null }
              : { success: true, data: value ?? null, error: null, meta: null };
            void this.cache.setJson(cacheKey, response, 24 * 60 * 60);
            return response;
          })
        );
      })
    );
  }
}
