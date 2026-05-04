import { RequestHandler } from 'express';
type Role = 'PUBLIC' | 'USER' | 'NETWORK' | 'MEMBER' | 'CORE_MEMBER' | 'ADMIN' | 'PRESIDENT';
export declare const hasPermission: (userRole: string, requiredRole: Role) => boolean;
export declare const requireRole: (minRole: Role) => RequestHandler;
export {};
