import { HttpException, HttpStatus } from "@nestjs/common";

export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

export function errorPayload(error: unknown): { code: string; message: string; details?: Record<string, unknown> } {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    };
  }
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === "object" && response !== null) {
      const value = response as Record<string, unknown>;
      return {
        code: typeof value.code === "string" ? value.code : "request_failed",
        message: typeof value.message === "string" ? value.message : error.message
      };
    }
    return { code: "request_failed", message: String(response) };
  }
  if (error instanceof Error) return { code: "internal_error", message: error.message };
  return { code: "internal_error", message: "Something went wrong." };
}
