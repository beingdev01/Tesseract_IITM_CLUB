"use client";

import { motion } from "framer-motion";
import { Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { membersApi } from "@/lib/api/services";
import { useAsyncAction } from "@/hooks/useApi";

const ORDER: Record<Role, number> = { guest: 0, member: 1, core: 2, admin: 3 };

export function RoleGuard({
  min,
  children,
}: {
  min: Role;
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const patchUserLocal = useAuthStore((s) => s.patchUserLocal);
  const resetSession = useAuthStore((s) => s.resetSession);
  const requestMembership = useAsyncAction(membersApi.request);
  const [hydrateTimedOut, setHydrateTimedOut] = useState(false);

  useEffect(() => {
    if (isHydrated) return;
    const timer = window.setTimeout(() => setHydrateTimedOut(true), 6000);
    return () => window.clearTimeout(timer);
  }, [isHydrated]);

  if (!isHydrated && !hydrateTimedOut) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-neon-cyan" />
      </div>
    );
  }

  if (!isHydrated && hydrateTimedOut) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-md w-full glass-strong rounded-3xl ring-gradient p-8 text-center">
          <h2 className="font-display text-xl text-white">Session recovery required</h2>
          <p className="mt-2 text-sm text-white/60">
            We could not restore your local session. Reset and sign in again.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              onClick={() => {
                resetSession();
                window.location.assign("/auth");
              }}
            >
              Reset session
            </Button>
            <Link href="/">
              <Button variant="secondary">Go home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (ORDER[role] >= ORDER[min]) return <>{children}</>;

  const isAuthenticatedGuest = !!user && role === "guest";

  const reason =
    role === "guest"
      ? "You need a Tesseract account to see this area."
      : `This section requires ${min} access.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] items-center justify-center"
    >
      <div className="max-w-md w-full glass-strong rounded-3xl ring-gradient p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/40 to-neon-cyan/30 shadow-glow-md">
          {role === "guest" ? (
            <Lock className="h-6 w-6 text-white" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-white" />
          )}
        </div>
        <h2 className="mt-5 font-display text-xl text-white">
          Restricted area
        </h2>
        <p className="mt-2 text-sm text-white/60">
          {isAuthenticatedGuest
            ? user.membershipStatus === "pending"
              ? "Your account is verified, and your membership request is pending core review."
              : "Your account is verified, but member access unlocks only after a membership request is approved."
            : reason}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!isAuthenticatedGuest ? (
            <Link href="/auth">
              <Button>Sign in</Button>
            </Link>
          ) : user.membershipStatus === "pending" ? (
            <Button variant="secondary" disabled>
              Membership pending
            </Button>
          ) : (
            <>
              <Button
                loading={requestMembership.loading}
                onClick={async () => {
                  try {
                    await requestMembership.run();
                    patchUserLocal({
                      membershipStatus: "pending",
                      membershipRequestedAt: new Date().toISOString(),
                    });
                    toast.success("Membership request submitted for review.");
                  } catch (error) {
                    toast.error((error as { message?: string })?.message ?? "Could not submit request");
                  }
                }}
              >
                Request membership
              </Button>
              <Link href="/events">
                <Button variant="secondary">Browse events</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
