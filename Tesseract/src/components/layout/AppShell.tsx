"use client";

import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { RoleGuard } from "./RoleGuard";
import type { Role } from "@/lib/types";

export function AppShell({
  children,
  minRole = "guest",
}: {
  children: React.ReactNode;
  minRole?: Role;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <RoleGuard min={minRole}>{children}</RoleGuard>
        </main>
      </div>
    </div>
  );
}
