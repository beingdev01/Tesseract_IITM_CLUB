"use client";

import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/lib/types";

const ORDER: Record<Role, number> = {
  guest: 0,
  member: 1,
  core: 2,
  admin: 3,
};

export function useRole() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;

  const can = (min: Role) => ORDER[role] >= ORDER[min];

  return {
    role,
    user,
    isAuthenticated,
    isGuest: role === "guest",
    isMember: can("member"),
    isCore: can("core"),
    isAdmin: role === "admin",
    can,
  };
}
