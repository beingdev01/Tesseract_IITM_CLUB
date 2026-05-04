"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { activityApi, dashboardApi, usersApi } from "@/lib/api/services";
import type { Activity, DashboardStats, User } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "NOW";
  if (mins < 60) return `${mins}M`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs <= 12 ? "TODAY" : "YEST.";
  const days = Math.floor(hrs / 24);
  if (days === 1) return "YEST.";
  if (days < 7) return `${days}D`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

const BADGE_NAMES = ["FIRST", "5 STREAK", "SHARPEYE", "NIGHT OWL", "LAP KING", "PUZZLER", "SCRIBE", "?", "?", "?"];
const BADGE_COLORS = ["red", "yellow", "green", "blue", "purple", "red", "yellow", "locked", "locked", "locked"];

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div className="lb-kicker">loading…</div></div>}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewedId = searchParams.get("id");
  const { user, isHydrated, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isHydrated && !user) router.replace("/auth");
  }, [isHydrated, user, router]);

  const { data: profile } = useApi<User>(
    () => (viewedId ? usersApi.profile(viewedId) : usersApi.me()),
    [viewedId],
  );
  const { data: stats } = useApi<DashboardStats>(() => dashboardApi.stats(), []);
  const { data: activity } = useApi<Activity[]>(
    () => activityApi.feed(viewedId ?? undefined).then((r) => (Array.isArray(r) ? r : [])),
    [viewedId],
  );

  if (!isHydrated || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  const display = profile ?? user;
  const isOwnProfile = !viewedId || viewedId === user.id;

  const xp = stats?.totalXP ?? display.xp ?? 0;
  const rank = stats?.rank ?? display.rank ?? 0;
  const streak = stats?.streak ?? display.streak ?? 0;
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const eventsJoined = stats?.eventsJoined ?? 0;
  const badgeCount = display.badges?.length ?? 0;

  const STATS: [string, string, Color][] = [
    ["RANK", rank > 0 ? `#${rank}` : "—", "yellow"],
    ["POINTS", xp.toLocaleString(), "blue"],
    ["GAMES", String(gamesPlayed), "green"],
    ["BADGES", String(badgeCount).padStart(2, "0"), "purple"],
    ["STREAK", streak > 0 ? `${streak}d` : "—", "red"],
    ["EVENTS", String(eventsJoined), "yellow"],
  ];

  const joinedAt = display.joinedAt
    ? new Date(display.joinedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "—";

  return (
    <div className="lb-root profile-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline={isOwnProfile ? "// member.profile" : `// profile · ${display.name.toLowerCase()}`}
        cta={<MeChip />}
      />

      <section className="profile-hero">
        <div className="profile-avatar lb-c-yellow">
          <span className="profile-avatar-letter">{display.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <div className="lb-kicker">{"// handle"}</div>
          <h1 className="profile-name">{display.name.toUpperCase()}</h1>
          <div className="profile-meta lb-c-yellow">
            <span>
              role · <b>{display.role}</b>
            </span>
            <span>
              joined · <b>{joinedAt}</b>
            </span>
            {display.level && (
              <span>
                level · <b>{display.level}</b>
              </span>
            )}
          </div>
          {display.bio && (
            <p style={{ marginTop: 12, color: "#bbb", maxWidth: 540 }}>{display.bio}</p>
          )}
        </div>
        <div className="dash-greet-meta">
          {isOwnProfile ? (
            <>
              <button className="lb-btn-primary" onClick={() => setEditing((v) => !v)}>
                {editing ? "CLOSE EDITOR" : "EDIT PROFILE ▶"}
              </button>
              <button
                className="lb-btn-ghost"
                style={{ marginTop: 8 }}
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                LOGOUT
              </button>
            </>
          ) : (
            <button className="lb-btn-ghost" onClick={() => router.push("/members")}>
              ← ALL MEMBERS
            </button>
          )}
        </div>
      </section>

      {editing && isOwnProfile && (
        <section style={{ padding: "24px 60px" }}>
          <Brackets tag="edit.profile" accent="yellow">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
              <label>
                NAME
                <input className="lb-input auth-input" defaultValue={display.name} />
              </label>
              <label>
                BIO
                <input className="lb-input auth-input" defaultValue={display.bio ?? ""} placeholder="quietly competitive" />
              </label>
            </div>
            <button
              className="lb-btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => {
                // PATCH /users/me would go here; backend Phase 1 may not expose it
                setEditing(false);
              }}
            >
              SAVE CHANGES ✓
            </button>
          </Brackets>
        </section>
      )}

      <section className="admin-stats">
        {STATS.map((s) => (
          <div key={s[0]} className={`admin-stat lb-c-${s[2]}`}>
            <div className="admin-stat-label">{s[0]}</div>
            <div className="admin-stat-val">{s[1]}</div>
          </div>
        ))}
      </section>

      <section className="dash-main">
        <div className="dash-col-l">
          <Brackets tag="timeline" accent="yellow">
            <h2 className="dash-h">ACTIVITY · LAST 30 DAYS</h2>
            <div className="dash-activity">
              {activity && activity.length > 0 ? (
                activity.slice(0, 12).map((a, i) => (
                  <div key={a.id} className={`dash-act-row lb-c-${colorAt(i)}`}>
                    <span className="dash-act-time">{fmtRelative(a.at)}</span>
                    <span className="dash-act-game lb-mono">{a.type}</span>
                    <span className="dash-act-text">{a.title}</span>
                  </div>
                ))
              ) : (
                <div className="dash-act-row lb-c-yellow">
                  <span className="dash-act-time">—</span>
                  <span className="dash-act-game lb-mono">no_activity</span>
                  <span className="dash-act-text">No activity yet — go play a game!</span>
                </div>
              )}
            </div>
          </Brackets>
        </div>

        <div className="dash-col-r">
          <Brackets tag="badges.collection" accent="purple">
            <h2 className="dash-h">BADGES · {badgeCount} / 24</h2>
            <div className="dash-badges">
              {display.badges && display.badges.length > 0 ? (
                display.badges.slice(0, 10).map((b, i) => (
                  <div key={b.id} className={`dash-badge lb-c-${colorAt(i)}`}>
                    <span className="dash-badge-glyph" />
                    <span className="dash-badge-name">{b.name.toUpperCase()}</span>
                  </div>
                ))
              ) : (
                BADGE_NAMES.map((b, i) => (
                  <div key={i} className={`dash-badge lb-c-${BADGE_COLORS[i]}`}>
                    <span className="dash-badge-glyph" />
                    <span className="dash-badge-name">{b}</span>
                  </div>
                ))
              )}
            </div>
          </Brackets>

          <Brackets tag="account" accent="green">
            <h2 className="dash-h">ACCOUNT INFO</h2>
            <div style={{ padding: "12px 0", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)" }}>
                <span style={{ color: "#888" }}>email</span>
                <b className="lb-mono">{display.email || "private"}</b>
              </div>
              {display.rollNumber && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)" }}>
                  <span style={{ color: "#888" }}>roll number</span>
                  <b className="lb-mono">{display.rollNumber}</b>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)" }}>
                <span style={{ color: "#888" }}>membership</span>
                <b className="lb-mono">{display.membershipStatus ?? display.role}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ color: "#888" }}>id</span>
                <b className="lb-mono" style={{ fontSize: 11 }}>{display.id.slice(0, 8)}…</b>
              </div>
            </div>
          </Brackets>
        </div>
      </section>

      <TesseractFooter context="profile" />
    </div>
  );
}
