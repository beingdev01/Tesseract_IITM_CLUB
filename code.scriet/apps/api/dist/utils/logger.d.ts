import { Request, Response, NextFunction } from 'express';
declare class Logger {
    private formatLog;
    private log;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    request(req: Request, res: Response, duration: number): void;
}
export declare const logger: Logger;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export {};
