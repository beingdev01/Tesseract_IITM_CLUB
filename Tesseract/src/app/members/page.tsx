"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { membersApi } from "@/lib/api/services";
import type { User } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
type RoleFilter = "all" | "member" | "core" | "admin";

const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

const ROLE_COLOR: Record<string, Color> = {
  member: "green",
  core: "yellow",
  admin: "red",
  guest: "blue",
};

export default function MembersPage() {
  const router = useRouter();
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  // Derive isAdmin only once auth is fully settled to avoid a stale closure
  const isAdmin = isHydrated && initialRefreshDone && user?.role === "admin";

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: members, loading, error } = useApi<User[]>(
    () => {
      // Don't fetch until auth is settled — avoids an empty Promise.resolve([])
      // baking into the stableFetcher before we know the real role.
      if (!isAdmin) return Promise.resolve([]);
      return membersApi
        .list({
          role: roleFilter === "all" ? undefined : roleFilter,
          search: search || undefined,
          pageSize: 100,
        })
        .then((r) => (Array.isArray(r) ? r : []));
    },
    [isAdmin, roleFilter, search],
  );

  const stats = useMemo(() => {
    if (!members) return { total: 0, members: 0, core: 0, admins: 0 };
    return {
      total: members.length,
      members: members.filter((m) => m.role === "member").length,
      core: members.filter((m) => m.role === "core").length,
      admins: members.filter((m) => m.role === "admin").length,
    };
  }, [members]);

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const roles: [RoleFilter, string][] = [
    ["all", "all"],
    ["member", "member"],
    ["core", "core"],
    ["admin", "admin"],
  ];

  return (
    <div className="lb-root members-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// members.directory"
        active="members"
        cta={<MeChip />}
      />

      <section className="members-hero">
        <div>
          <div className="lb-kicker">{"// roster.v1"}</div>
          <h1 className="members-title">
            THE <span className="lb-h-accent">ROSTER.</span>
          </h1>
          <p className="lb-sub">
            {members ? `${members.length} registered members` : "Loading roster…"} across DS and ES batches. These are the
            ones building the points.
          </p>
        </div>
        <div className="members-hero-stats">
          <div className="gd-stat">
            <span>TOTAL</span>
            <b>{stats.total}</b>
          </div>
          <div className="gd-stat">
            <span>MEMBERS</span>
            <b>{stats.members}</b>
          </div>
          <div className="gd-stat">
            <span>CORE</span>
            <b>{stats.core}</b>
          </div>
          <div className="gd-stat">
            <span>ADMINS</span>
            <b>{stats.admins}</b>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="members-filters">
        <div className="members-filter-group">
          <span className="members-filter-label">SEARCH</span>
          <input
            className="lb-input"
            placeholder="search by name or handle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: "200px", padding: "8px 12px" }}
          />
        </div>
        <div className="members-filter-group">
          <span className="members-filter-label">ROLE</span>
          {roles.map(([r, label]) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`members-filter-btn lb-c-yellow${roleFilter === r ? " active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="members-filter-count">
          {members?.length ?? 0} shown
        </div>
      </div>

      {/* Member grid */}
      <section className="members-grid">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className={`member-card lb-c-${colorAt(i)}`} style={{ opacity: 0.4 }}>
              <div className="member-card-top">
                <div className={`member-avatar lb-c-${colorAt(i)}`}>
                  <span className="member-avatar-letter">·</span>
                </div>
                <div className={`member-role-badge lb-c-green`}>—</div>
              </div>
              <div className="member-card-body">
                <div className="member-handle">loading…</div>
              </div>
            </div>
          ))
        ) : error ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "#888" }}>
            <div className="lb-kicker" style={{ marginBottom: "12px" }}>{"// access_denied"}</div>
            <p>{error.message}</p>
          </div>
        ) : !members || members.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "#888" }}>
            <div className="lb-kicker" style={{ marginBottom: "12px" }}>{"// no_members"}</div>
            <p>No members match your filters.</p>
          </div>
        ) : (
          members.map((m, i) => {
            const c = colorAt(i);
            return (
              <div key={m.id} className={`member-card lb-c-${c}`}>
                <div className="member-card-top">
                  <div className={`member-avatar lb-c-${c}`}>
                    <span className="member-avatar-letter">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={`member-role-badge lb-c-${ROLE_COLOR[m.role] ?? "blue"}`}>
                    {m.role}
                  </div>
                </div>
                <div className="member-card-body">
                  <div className="member-handle">{m.name}</div>
                  <div className="member-batch">{m.email || (m.rollNumber ? `roll · ${m.rollNumber}` : "private")}</div>
                  <div className="member-stats">
                    <div className="member-stat">
                      <span>RANK</span>
                      <b>{m.rank ? `#${m.rank}` : "—"}</b>
                    </div>
                    <div className="member-stat">
                      <span>PTS</span>
                      <b>{(m.xp ?? 0).toLocaleString()}</b>
                    </div>
                    <div className="member-stat">
                      <span>LEVEL</span>
                      <b>{m.level ?? "—"}</b>
                    </div>
                    <div className="member-stat">
                      <span>STREAK</span>
                      <b>{m.streak ?? 0}d</b>
                    </div>
                  </div>
                </div>
                <Link href={m.id === user.id ? "/profile" : `/profile?id=${m.id}`} className="lb-btn-ghost member-card-cta">
                  {m.id === user.id ? "YOUR PROFILE →" : "VIEW PROFILE →"}
                </Link>
              </div>
            );
          })
        )}
      </section>

      <TesseractFooter />
    </div>
  );
}
