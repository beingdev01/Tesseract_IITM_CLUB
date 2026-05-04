"use client";

import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { AUTH_CLEARED_EVENT } from "@/lib/auth-storage";
import { usersApi } from "@/lib/api/services";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const refresh = useAuthStore((s) => s.refresh);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const resetSession = useAuthStore((s) => s.resetSession);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isHydrated) refresh();
  }, [isHydrated, refresh]);

  useEffect(() => {
    const onCleared = () => resetSession();
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
  }, [resetSession]);

  // Heartbeat — keep backend `lastSeenAt` fresh so live-now counts are real
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      usersApi.me().catch(() => null);
    }, 60000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(10,11,18,0.92)",
            color: "#F5F7FF",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            fontSize: "14px",
            padding: "10px 14px",
            boxShadow:
              "0 10px 30px -10px rgba(168,85,247,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset",
          },
          success: { iconTheme: { primary: "#38F9A0", secondary: "#05060A" } },
          error: { iconTheme: { primary: "#FF3860", secondary: "#05060A" } },
        }}
      />
    </>
  );
}
