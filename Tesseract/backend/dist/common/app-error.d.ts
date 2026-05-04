import { HttpException } from "@nestjs/common";
export declare class AppError extends HttpException {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, status?: number, details?: Record<string, unknown> | undefined);
}
export declare function errorPayload(error: unknown): {
    code: string;
    message: string;
    details?: Record<string, unknown>;
};
