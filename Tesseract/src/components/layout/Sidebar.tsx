"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap } from "lucide-react";
import { useEffect } from "react";

import { Logo } from "@/components/ui/Logo";
import { Pill } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { useApi } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api/services";
import { navForRole } from "./nav-config";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export function Sidebar() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const items = navForRole(role);
  const pathname = usePathname();
  const open = useUIStore((s) => s.sidebarOpen);
  const setOpen = useUIStore((s) => s.setSidebarOpen);
  const upcomingEvent = useApi(
    () => eventsApi.list({ pageSize: 1, status: "upcoming" }),
    [],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const levelProgress = user ? ((user.xp % 5000) / 5000) * 100 : 0;

  const content = (
    <div className="flex h-full flex-col gap-4">
      <div className="hidden md:flex items-center justify-between px-2 py-1">
        <Logo size={28} />
      </div>

      {user && (
        <div className="relative mx-2 overflow-hidden rounded-2xl glass p-4 ring-gradient">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan shadow-glow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm text-white">
                {user.level ?? "Bronze"}
              </p>
              <p className="text-xs text-white/50">
                {formatNumber(user.xp)} XP
              </p>
            </div>
          </div>
          <Progress value={levelProgress} className="mt-3" />
          <p className="mt-2 text-[11px] text-white/50">
            {Math.round(5000 - (user.xp % 5000))} XP to next tier
          </p>
        </div>
      )}

      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== "/" && pathname?.startsWith(it.href));
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    active
                      ? "text-white"
                      : "text-white/65 hover:text-white hover:bg-white/5",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-purple/15 via-neon-cyan/10 to-transparent ring-1 ring-white/10 shadow-glow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-4 w-4 transition-colors",
                      active ? "text-neon-cyan" : "text-white/50 group-hover:text-white",
                    )}
                  />
                  <span className="relative">{it.label}</span>
                  {it.badge && (
                    <Pill tone="purple" className="relative ml-auto">
                      {it.badge}
                    </Pill>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-2 mb-3 rounded-2xl glass p-4 overflow-hidden relative">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-neon-pink/30 blur-2xl" />
        <p className="relative font-display text-sm text-white">
          {upcomingEvent.data?.[0]?.title ?? "Discover the next drop"}
        </p>
        <p className="relative mt-1 text-xs text-white/60">
          {upcomingEvent.data?.[0]
            ? `${formatDate(upcomingEvent.data[0].startsAt)} · ${upcomingEvent.data[0].location}`
            : "Events, games, and challenges unlock here as the community grows."}
        </p>
        <Link
          href="/events"
          className="relative mt-3 inline-flex items-center text-xs font-medium text-neon-cyan hover:text-white transition-colors"
        >
          {upcomingEvent.data?.[0] ? "See event details →" : "Browse events →"}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r border-white/5 bg-ink-950/40 backdrop-blur-xl md:block">
        <div className="flex h-full flex-col py-4">{content}</div>
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-ink-950/70 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-ink-950/90 backdrop-blur-xl"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                <Logo size={26} />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-65px)] py-4">{content}</div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
