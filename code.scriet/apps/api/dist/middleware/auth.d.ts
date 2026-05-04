import { Request, RequestHandler } from 'express';
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    phone?: string | null;
    course?: string | null;
    branch?: string | null;
    year?: string | null;
    profileCompleted?: boolean | null;
}
export interface AuthRequest extends Request {
    authUser?: AuthUser;
}
export declare const getAuthUser: (req: Request) => AuthUser | undefined;
export declare const requireAuthUser: (req: Request) => AuthUser;
export declare const authMiddleware: RequestHandler;
export declare const optionalAuthMiddleware: RequestHandler;
