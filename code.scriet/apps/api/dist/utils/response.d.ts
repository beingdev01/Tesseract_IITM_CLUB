import { Response } from 'express';
export interface SuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: PaginationMeta;
}
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore?: boolean;
}
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
    status?: number;
}
export declare const ErrorCodes: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_FIELD: "MISSING_FIELD";
    readonly BAD_REQUEST: "BAD_REQUEST";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly CONFLICT: "CONFLICT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly REGISTRATION_CLOSED: "REGISTRATION_CLOSED";
    readonly EVENT_FULL: "EVENT_FULL";
    readonly ALREADY_REGISTERED: "ALREADY_REGISTERED";
    readonly REGISTRATION_NOT_STARTED: "REGISTRATION_NOT_STARTED";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
export declare const ApiResponse: {
    success<T>(res: Response, data: T, message?: string): Response<any, Record<string, any>>;
    created<T>(res: Response, data: T, message?: string): Response<any, Record<string, any>>;
    paginated<T>(res: Response, data: T[], meta: PaginationMeta): Response<any, Record<string, any>>;
    noContent(res: Response): Response<any, Record<string, any>>;
    error(res: Response, error: ApiError): Response<any, Record<string, any>>;
    unauthorized(res: Response, message?: string): Response<any, Record<string, any>>;
    forbidden(res: Response, message?: string): Response<any, Record<string, any>>;
    notFound(res: Response, message?: string): Response<any, Record<string, any>>;
    badRequest(res: Response, message: string, details?: unknown): Response<any, Record<string, any>>;
    validationError(res: Response, errors: Array<{
        field: string;
        message: string;
    }>): Response<any, Record<string, any>>;
    conflict(res: Response, message: string): Response<any, Record<string, any>>;
    internal(res: Response, message?: string): Response<any, Record<string, any>>;
    rateLimited(res: Response, message?: string): Response<any, Record<string, any>>;
};
export declare const apiResponse: (res: Response) => {
    success: <T>(data: T, message?: string) => Response<any, Record<string, any>>;
    created: <T>(data: T, message?: string) => Response<any, Record<string, any>>;
    error: (error: ApiError) => Response<any, Record<string, any>>;
    notFound: (message?: string) => Response<any, Record<string, any>>;
    unauthorized: (message?: string) => Response<any, Record<string, any>>;
    forbidden: (message?: string) => Response<any, Record<string, any>>;
};
