"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/lib/types";

type NavLinkKey = "home" | "games" | "events" | "ranks" | "members" | "core";

const NAV_LINKS: { key: NavLinkKey; label: string; href: string; n: string; minRole: Role }[] =
  [
    { key: "home", label: "home", href: "/dashboard", n: "01", minRole: "member" },
    { key: "games", label: "games", href: "/games", n: "02", minRole: "guest" },
    { key: "events", label: "events", href: "/events", n: "03", minRole: "guest" },
    { key: "ranks", label: "ranks", href: "/leaderboard", n: "04", minRole: "guest" },
    { key: "members", label: "members", href: "/members", n: "05", minRole: "admin" },
    { key: "core", label: "core", href: "/admin", n: "06", minRole: "admin" },
  ];

const ROLE_ORDER: Record<Role, number> = { guest: 0, member: 1, core: 2, admin: 3 };

type TesseractNavProps = {
  subline?: string;
  active?: NavLinkKey | string;
  showLinks?: boolean;
  cta?: ReactNode;
};

export function TesseractNav({
  subline = "// IITM_BS.community",
  active,
  showLinks = true,
  cta,
}: TesseractNavProps) {
  const role = useAuthStore((s) => s.role);
  const visibleLinks = NAV_LINKS.filter((link) => ROLE_ORDER[role] >= ROLE_ORDER[link.minRole]);

  return (
    <nav className="lb-nav">
      <Link href="/" className="lb-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Tesseract" className="lb-logo" />
        <div>
          <div className="lb-wordmark">TESSERACT</div>
          <div className="lb-wordmark-sub">{subline}</div>
        </div>
      </Link>
      {showLinks && (
        <div className="lb-nav-links">
          {visibleLinks.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={active === l.key ? "active" : ""}
            >
              [{l.n}] {l.label}
            </Link>
          ))}
        </div>
      )}
      <div className="lb-nav-cta">{cta}</div>
    </nav>
  );
}

export function MeChip({
  name,
  role,
  accent = "yellow",
}: {
  name?: string;
  role?: string;
  accent?: "red" | "orange" | "yellow" | "green" | "blue" | "purple";
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  const displayName = name ?? user?.name ?? "guest";
  const displayRole = role ?? (user ? `${userRole} · ${user.rollNumber ?? user.email.split("@")[0]}` : "not logged in");

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="dash-me" style={{ cursor: "pointer" }} onClick={handleLogout} title="Click to logout">
      <div className={`dash-me-avatar lb-c-${accent}`}>
        <span />
      </div>
      <div className="dash-me-name">
        <div>{displayName}</div>
        <div className="dash-me-role">{displayRole}</div>
      </div>
    </div>
  );
}

export function StatusOnline({ online }: { online: number }) {
  return (
    <div className="lb-status">
      <span className="lb-status-dot" />
      <span>{online} online</span>
    </div>
  );
}
