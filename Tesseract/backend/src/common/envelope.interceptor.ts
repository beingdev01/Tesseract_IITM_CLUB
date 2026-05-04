import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

import type { EnvelopeResult } from "./envelope";

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (
          value &&
          typeof value === "object" &&
          "success" in value &&
          "data" in value &&
          "error" in value
        ) {
          return value;
        }
        const maybeEnvelope = value as Partial<EnvelopeResult<unknown>>;
        if (maybeEnvelope && maybeEnvelope.__envelope) {
          return {
            success: true,
            data: maybeEnvelope.data,
            error: null,
            meta: maybeEnvelope.meta ?? null
          };
        }
        return { success: true, data: value ?? null, error: null, meta: null };
      })
    );
  }
}
