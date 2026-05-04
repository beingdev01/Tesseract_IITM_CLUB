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

export const roleRank: Record<Role, number> = {
  guest: 0,
  member: 1,
  core: 2,
  admin: 3
};

export function hasMinRole(actual: Role, minimum: Role): boolean {
  return roleRank[actual] >= roleRank[minimum];
}
