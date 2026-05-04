import {
  LayoutDashboard,
  Calendar,
  Gamepad2,
  Trophy,
  User,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  minRole: Role;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minRole: "member" },
  { label: "Events", href: "/events", icon: Calendar, minRole: "guest" },
  { label: "Games", href: "/games", icon: Gamepad2, minRole: "member" },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy, minRole: "guest" },
  { label: "Profile", href: "/profile", icon: User, minRole: "member" },
  { label: "Admin", href: "/admin", icon: Shield, minRole: "admin", badge: "ADMIN" },
];

export const PUBLIC_ITEMS: NavItem[] = [
  { label: "Explore", href: "/", icon: Sparkles, minRole: "guest" },
  { label: "Events", href: "/events", icon: Calendar, minRole: "guest" },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy, minRole: "guest" },
];

const ORDER: Record<Role, number> = { guest: 0, member: 1, core: 2, admin: 3 };

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((n) => ORDER[role] >= ORDER[n.minRole]);
}
