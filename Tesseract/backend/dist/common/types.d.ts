import type { Request } from "express";
export type Role = "guest" | "member" | "core" | "admin";
export type AuthUser = {
    id: string;
    role: Role;
    email: string;
};
export type AuthedRequest = Request & {
    user?: AuthUser;
};
export declare const roleRank: Record<Role, number>;
export declare function hasMinRole(actual: Role, minimum: Role): boolean;
