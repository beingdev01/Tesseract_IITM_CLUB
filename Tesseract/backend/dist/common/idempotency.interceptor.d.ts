import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { CacheService } from "./cache.service";
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly cache;
    constructor(cache: CacheService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
