"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { activityApi, adminApi, eventsApi, gamesApi } from "@/lib/api/services";
import type { Activity, AdminAnalytics, Game, Role, TesseractEvent, User } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) {
      router.replace("/auth");
    } else if (user.role !== "admin") {
      toast.error("Admin access required");
      router.replace("/dashboard");
    }
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: analytics, refetch: refetchAnalytics } = useApi<AdminAnalytics>(
    () => (user?.role === "admin" ? adminApi.analytics() : Promise.reject({ message: "denied" })),
    [user?.role],
  );
  const { data: users, refetch: refetchUsers } = useApi<User[]>(
    () =>
      user?.role === "admin"
        ? adminApi.users().then((r) => (Array.isArray(r) ? r : []))
        : Promise.resolve([]),
    [user?.role],
  );
  const { data: events } = useApi<TesseractEvent[]>(
    () => eventsApi.list({ pageSize: 10 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );
  const { data: games } = useApi<Game[]>(
    () => gamesApi.list({ pageSize: 100 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );
  const { data: activityLog, refetch: refetchActivity } = useApi<Activity[]>(
    () => activityApi.feed().then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  // Live polling — analytics + activity log refresh every 15s
  useEffect(() => {
    if (user?.role !== "admin") return;
    const id = setInterval(() => {
      refetchAnalytics();
      refetchActivity();
    }, 15000);
    return () => clearInterval(id);
  }, [user?.role, refetchAnalytics, refetchActivity]);

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return null;
  }

  const handleRoleChange = async (userId: string, currentRole: Role) => {
    const order: Role[] = ["guest", "member", "core", "admin"];
    const idx = order.indexOf(currentRole);
    const next = order[(idx + 1) % order.length];
    const ok = window.confirm(`Change role from "${currentRole}" → "${next}"?`);
    if (!ok) return;
    setActionPending(userId);
    try {
      await adminApi.setRole(userId, next);
      toast.success(`Role updated to ${next}`);
      refetchUsers();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Failed to update role");
    } finally {
      setActionPending(null);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!window.confirm(`Delete event "${title}"?`)) return;
    setActionPending(id);
    try {
      await eventsApi.remove(id);
      toast.success("Event deleted");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Could not delete");
    } finally {
      setActionPending(null);
    }
  };

  const recentUsers = (users ?? []).slice(0, 6);
  const liveEvents = (events ?? []).filter((e) => e.status === "live").length;
  const totalUsers = users?.length ?? analytics?.funnel?.find((f) => f.stage === "Users")?.count ?? 0;
  const totalGames = games?.length ?? analytics?.games ?? 0;
  const totalEvents = events?.length ?? analytics?.events ?? 0;
  const liveNow = analytics?.liveNow ?? 0;

  const STATS: [string, string, string, Color][] = [
    ["MEMBERS", String(totalUsers), `${recentUsers.length} recent`, "yellow"],
    ["LIVE NOW", String(liveNow), "last 15min", "green"],
    ["EVENTS LIVE", String(liveEvents), `${totalEvents} total`, "red"],
    ["GAMES", String(totalGames), "in catalog", "blue"],
    ["DAU", String(analytics?.dau ?? 0), "today", "purple"],
    ["WAU", String(analytics?.wau ?? 0), "this week", "green"],
  ];

  const ACTIONS: [string, string, Color, () => void][] = [
    ["+", "NEW EVENT", "yellow", () => router.push("/admin/events/new")],
    ["⊞", "ADD GAME", "green", () => toast("Game registration coming soon", { icon: "🎮" })],
    ["⌘", "ASSIGN CORE", "blue", () => toast("Use the EDIT button on a user row", { icon: "👤" })],
    ["⚠", "REVIEW FLAGS", "red", () => toast("Flag review queue coming soon", { icon: "⚠" })],
    ["↗", "EXPORT CSV", "purple", () => toast.success("Exporting users.csv…")],
    ["✦", "BROADCAST", "yellow", () => toast("Broadcast queue coming soon", { icon: "📢" })],
  ];

  return (
    <div className="lb-root admin-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// core.panel · admin"
        active="core"
        cta={
          <>
            <div className="auth-success-pill">
              <span /> {user.role.toUpperCase()} MODE
            </div>
            <MeChip accent="red" />
          </>
        }
      />

      <section className="admin-stats">
        {STATS.map((s) => (
          <div key={s[0]} className={`admin-stat lb-c-${s[3]}`}>
            <div className="admin-stat-label">{s[0]}</div>
            <div className="admin-stat-val">{s[1]}</div>
            <div className="admin-stat-meta">{s[2]}</div>
          </div>
        ))}
      </section>

      <section className="admin-main">
        <div className="admin-col-l">
          <Brackets tag="users.recent" accent="yellow">
            <div className="admin-section-head">
              <h3 className="dash-h">RECENT MEMBERS · {recentUsers.length}</h3>
              <button className="lb-btn-ghost admin-mini-btn" onClick={() => router.push("/members")}>
                VIEW ALL →
              </button>
            </div>
            <div className="admin-user-table">
              <div className="admin-user-head">
                <span>HANDLE</span>
                <span>EMAIL</span>
                <span>JOINED</span>
                <span>ROLE</span>
                <span></span>
              </div>
              {recentUsers.length === 0 ? (
                <div style={{ padding: "20px 12px", color: "#888", fontSize: 13 }}>No users yet.</div>
              ) : (
                recentUsers.map((u, i) => (
                  <div key={u.id} className="admin-user-row">
                    <span className="admin-user-handle">
                      <span className={`lb-avatar-chip lb-c-${colorAt(i)}`} />
                      <span>{u.name}</span>
                    </span>
                    <span className="lb-mono lb-dim">{u.email || "private"}</span>
                    <span className="lb-mono">{u.joinedAt ? fmtRelative(u.joinedAt) : "—"}</span>
                    <span className={`admin-role admin-role-${u.role}`}>{u.role}</span>
                    <button
                      className="lb-btn-ghost admin-mini-btn"
                      onClick={() => handleRoleChange(u.id, u.role)}
                      disabled={actionPending === u.id || user.role !== "admin"}
                    >
                      {actionPending === u.id ? "…" : "EDIT"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </Brackets>

          <Brackets tag="events.manage" accent="red">
            <div className="admin-section-head">
              <h3 className="dash-h">UPCOMING EVENTS · {events?.length ?? 0}</h3>
              <button className="lb-btn-primary admin-mini-btn" onClick={() => router.push("/admin/events/new")}>
                + NEW EVENT
              </button>
            </div>
            <div className="admin-event-table">
              {!events || events.length === 0 ? (
                <div style={{ padding: "20px 12px", color: "#888", fontSize: 13 }}>No events scheduled.</div>
              ) : (
                events.map((e, i) => (
                  <div key={e.id} className={`admin-event-row lb-c-${colorAt(i)}`}>
                    <span className="admin-event-title">{e.title.toUpperCase()}</span>
                    <span className="lb-mono lb-dim">{fmtDateTime(e.startsAt)}</span>
                    <span className="lb-mono">{e.registered} going</span>
                    <span className={`admin-status admin-status-${e.status === "live" ? "live" : "draft"}`}>
                      {e.status}
                    </span>
                    <div className="admin-event-actions">
                      <button
                        className="lb-btn-ghost admin-mini-btn"
                        onClick={() => router.push(`/events/${e.id}`)}
                      >
                        VIEW
                      </button>
                      <button
                        className="lb-btn-ghost admin-mini-btn"
                        onClick={() => handleDeleteEvent(e.id, e.title)}
                        disabled={actionPending === e.id}
                      >
                        {actionPending === e.id ? "…" : "DEL"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Brackets>
        </div>

        <div className="admin-col-r">
          <Brackets tag="activity.log" accent="green">
            <h3 className="dash-h">ACTIVITY LOG · LIVE</h3>
            <div className="admin-log">
              {!activityLog || activityLog.length === 0 ? (
                <div style={{ padding: "20px 12px", color: "#888", fontSize: 13 }}>No recent activity.</div>
              ) : (
                activityLog.slice(0, 12).map((l, i) => (
                  <div key={l.id} className={`admin-log-row lb-c-${colorAt(i)}`}>
                    <span className="admin-log-time">{fmtTime(l.at)}</span>
                    <span className="admin-log-type">{l.type.toUpperCase()}</span>
                    <span className="admin-log-text">{l.title}</span>
                  </div>
                ))
              )}
            </div>
          </Brackets>

          <Brackets tag="quick_actions" accent="purple">
            <h3 className="dash-h">QUICK ACTIONS</h3>
            <div className="admin-actions">
              {ACTIONS.map((a) => (
                <button key={a[1]} className={`admin-action lb-c-${a[2]}`} onClick={a[3]}>
                  <span className="admin-action-glyph">{a[0]}</span>
                  <span>{a[1]}</span>
                </button>
              ))}
            </div>
          </Brackets>
        </div>
      </section>

      <TesseractFooter context="admin" />
    </div>
  );
}
