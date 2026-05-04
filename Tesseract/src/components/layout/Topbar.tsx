"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useApi } from "@/hooks/useApi";
import { activityApi } from "@/lib/api/services";
import { relativeTime, cn } from "@/lib/utils";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications = useApi(
    () => (user ? activityApi.notifications() : Promise.resolve([])),
    [user?.id],
  );
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const markUnreadAsRead = async () => {
    const unreadItems = (notifications.data ?? []).filter((n) => !n.read);
    if (unreadItems.length === 0) return;
    await Promise.allSettled(unreadItems.map((item) => activityApi.markRead(item.id)));
    await notifications.refetch();
  };

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onLogout = async () => {
    await logout();
    toast.success("Signed out");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-x-0 top-0 h-full bg-ink-950/60 backdrop-blur-xl border-b border-white/5" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/25 md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href={user ? "/dashboard" : "/"} aria-label="Home">
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex">
            <div className="group relative flex items-center gap-2 rounded-xl glass px-3 py-2 text-sm text-white/60 focus-within:border-neon-purple/50 focus-within:shadow-glow-sm">
              <Search className="h-4 w-4" />
              <input
                placeholder="Search events, games, players…"
                className="w-56 bg-transparent outline-none placeholder:text-white/40 lg:w-72"
              />
              <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] lg:inline">
                ⌘K
              </kbd>
            </div>
          </div>

          {user ? (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  aria-label="Notifications"
                  onClick={async () => {
                    setNotifOpen((v) => !v);
                    if (!notifOpen) {
                      await markUnreadAsRead();
                    }
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/25"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-neon-red to-neon-orange px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-80 glass-strong rounded-2xl ring-gradient overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <h4 className="font-display text-sm text-white">Notifications</h4>
                        {unread > 0 && (
                          <Pill tone="purple">{unread} new</Pill>
                        )}
                      </div>
                      <ul className="max-h-80 overflow-y-auto">
                        {(notifications.data ?? []).map((n) => (
                          <li
                            key={n.id}
                            className={cn(
                              "relative px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors",
                              !n.read && "bg-neon-purple/5",
                            )}
                          >
                            {!n.read && (
                              <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-neon-cyan" />
                            )}
                            <p className="text-sm text-white">{n.title}</p>
                            <p className="mt-0.5 text-xs text-white/50">{n.body}</p>
                            <p className="mt-1 text-[11px] text-white/40">
                              {relativeTime(n.at)}
                            </p>
                          </li>
                        ))}
                        {notifications.loading && (
                          <li className="px-4 py-6 text-center text-xs text-white/50">
                            Loading…
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  aria-label="Account"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 pl-1 pr-3 py-1 hover:border-white/25 transition-colors"
                >
                  <Avatar name={user.name} src={user.avatar} size={28} />
                  <span className="hidden text-sm text-white/90 sm:block">
                    {user.name.split(" ")[0]}
                  </span>
                  <Pill tone="purple" className="hidden sm:inline-flex uppercase">
                    {role}
                  </Pill>
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 glass-strong rounded-xl ring-gradient overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm text-white">{user.name}</p>
                        <p className="truncate text-xs text-white/50">{user.email}</p>
                      </div>
                      <button
                        onClick={() => router.push("/profile")}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                      >
                        <UserIcon className="h-4 w-4" /> Profile
                      </button>
                      <button
                        onClick={() => toast("Settings coming soon", { icon: "⚙️" })}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                      >
                        <Settings className="h-4 w-4" /> Settings
                      </button>
                      <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-neon-red hover:bg-neon-red/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push("/auth")}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => router.push("/auth")}>
                Join Tesseract
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
