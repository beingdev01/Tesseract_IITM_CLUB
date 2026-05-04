"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, StatusOnline, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { activityApi, dashboardApi, eventsApi, leaderboardApi, announcementsApi } from "@/lib/api/services";
import type { Activity, DashboardStats, LeaderboardEntry, PublicDashboardSummary, TesseractEvent, Announcement } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yest.";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const BADGE_NAMES = ["FIRST", "5 STREAK", "SHARPEYE", "NIGHT OWL", "LAP KING", "PUZZLER", "SCRIBE", "?", "?", "?"];
const BADGE_COLORS: Color[] = ["red", "yellow", "green", "blue", "purple", "red", "yellow", "locked" as unknown as Color, "locked" as unknown as Color, "locked" as unknown as Color];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !user) router.replace("/auth");
  }, [isHydrated, user, router]);

  const { data: stats, refetch: refetchStats } = useApi<DashboardStats>(() => dashboardApi.stats(), []);
  const { data: activityFeed, refetch: refetchActivity } = useApi<Activity[]>(() => activityApi.feed().then((r) => (Array.isArray(r) ? r : [])), []);
  const { data: leaderboard } = useApi<LeaderboardEntry[]>(() => leaderboardApi.global({ pageSize: 30 }).then((r) => (Array.isArray(r) ? r : [])), []);
  const { data: events } = useApi<TesseractEvent[]>(() => eventsApi.list({ pageSize: 5 }).then((r) => (Array.isArray(r) ? r : [])), []);
  const { data: publicSummary, refetch: refetchSummary } = useApi<PublicDashboardSummary>(() => dashboardApi.publicSummary(), []);
  const { data: announcements, refetch: refetchAnnouncements } = useApi<Announcement[]>(() => announcementsApi.list().then(r => Array.isArray(r) ? r : []), []);

  // Real-data polling — refresh "online" count + stats every 20s
  useEffect(() => {
    const id = setInterval(() => {
      refetchSummary();
      refetchStats();
      refetchActivity();
      refetchAnnouncements();
    }, 20000);
    return () => clearInterval(id);
  }, [refetchSummary, refetchStats, refetchActivity, refetchAnnouncements]);

  const online = publicSummary?.liveGames?.reduce((sum, g) => sum + g.playersOnline, 0) ?? 0;

  if (!isHydrated || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  const rank = stats?.rank ?? user.rank ?? 0;
  const streak = stats?.streak ?? user.streak ?? 0;
  const xp = stats?.totalXP ?? user.xp ?? 0;
  const badgeCount = user.badges?.length ?? 0;
  const firstName = user.name?.split(" ")[0]?.toUpperCase() ?? "MEMBER";

  // Find user's position in leaderboard
  const userIdx = leaderboard ? leaderboard.findIndex((e) => e.userId === user.id) : -1;
  const neighborhood = leaderboard
    ? leaderboard.slice(Math.max(0, userIdx - 2), userIdx + 3)
    : [];

  const nextEvent = events && events.length > 0 ? events[0] : null;

  return (
    <div className="lb-root dash-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// member.dashboard"
        active="home"
        cta={
          <>
            <StatusOnline online={online} />
            <MeChip />
          </>
        }
      />

      <section className="dash-greet">
        <div>
          <div className="lb-kicker">{"// session_resumed"}</div>
          <h1 className="dash-greet-title">
            WELCOME BACK, <span className="lb-h-accent">{firstName}.</span>
          </h1>
          <p className="dash-greet-sub">
            {stats
              ? `${stats.gamesPlayed} games played · ${stats.eventsJoined} events joined · rank #${rank}`
              : "Loading your stats…"}
          </p>
        </div>
        <div className="dash-greet-meta">
          <div className="dash-meta-item lb-c-yellow">
            <span>RANK</span>
            <b>{rank > 0 ? `#${rank}` : "—"}</b>
          </div>
          <div className="dash-meta-item lb-c-green">
            <span>STREAK</span>
            <b>{streak > 0 ? `${streak}d` : "—"}</b>
          </div>
          <div className="dash-meta-item lb-c-blue">
            <span>POINTS</span>
            <b>{xp > 0 ? xp.toLocaleString() : "—"}</b>
          </div>
          <div className="dash-meta-item lb-c-purple">
            <span>BADGES</span>
            <b>{String(badgeCount).padStart(2, "0")}</b>
          </div>
        </div>
      </section>

      <section className="dash-main">
        <div className="dash-col-l">
          
          {announcements && announcements.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <Brackets tag="system.announcements" accent="blue">
                <h2 className="dash-h">ANNOUNCEMENTS</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {announcements.map((a, i) => (
                    <div key={a.id} className={`lb-c-${colorAt(i)}`} style={{ padding: 16, backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid currentColor", borderRadius: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>{a.title} {a.pinned && "📌"}</h3>
                        <span className="lb-mono" style={{ fontSize: 12 }}>{fmtRelative(a.publishedAt)}</span>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: a.content }} style={{ lineHeight: 1.5, color: "var(--fg)" }} />
                    </div>
                  ))}
                </div>
              </Brackets>
            </div>
          )}

          <Brackets tag="continue.playing" accent="green">
            <h2 className="dash-h">PICK UP WHERE YOU LEFT OFF</h2>
            <div className="dash-continue">
              <div className="dash-cont-card lb-c-red">
                <div className="dash-cont-art" />
                <div className="dash-cont-body">
                  <div className="dash-cont-tag">GAMES HUB</div>
                  <div className="dash-cont-title">Explore the Game Catalog</div>
                  <div className="dash-cont-meta">New games drop monthly</div>
                  <Link href="/games" className="lb-btn-primary dash-cont-btn">
                    BROWSE ▶
                  </Link>
                </div>
              </div>
              <div className="dash-cont-card lb-c-blue">
                <div className="dash-cont-art" />
                <div className="dash-cont-body">
                  <div className="dash-cont-tag">LEADERBOARD</div>
                  <div className="dash-cont-title">Check Your Rank</div>
                  <div className="dash-cont-meta">Season rankings, live</div>
                  <Link href="/leaderboard" className="lb-btn-ghost dash-cont-btn">
                    VIEW RANKS →
                  </Link>
                </div>
              </div>
            </div>
          </Brackets>

          <Brackets tag="activity.feed" accent="yellow">
            <h2 className="dash-h">YOUR ACTIVITY · LAST 7 DAYS</h2>
            <div className="dash-activity">
              {activityFeed && activityFeed.length > 0 ? (
                activityFeed.slice(0, 8).map((a, i) => (
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
                  <span className="dash-act-text">Start playing to build your feed</span>
                </div>
              )}
            </div>
          </Brackets>
        </div>

        <div className="dash-col-r">
          <Brackets tag="tonight" accent="red">
            <h2 className="dash-h">UP NEXT</h2>
            {nextEvent ? (
              <div className="dash-event-card">
                <div className="dash-event-time">
                  <span>{nextEvent.status.toUpperCase()}</span>
                  <b>{fmtTime(nextEvent.startsAt)}</b>
                  <span>IST</span>
                </div>
                <div className="dash-event-title">{nextEvent.title.toUpperCase()}</div>
                <div className="dash-event-desc">{nextEvent.description}</div>
                <div className="dash-event-rsvps">
                  <div className="dash-rsvp-stack">
                    {[...Array(Math.min(5, nextEvent.registered))].map((_, i) => (
                      <span key={i} className={`lb-c-${colorAt(i)}`} />
                    ))}
                  </div>
                  <span>+ {nextEvent.registered} going</span>
                </div>
                <Link href={`/events/${nextEvent.id}`} className="lb-btn-primary dash-event-cta">
                  VIEW EVENT →
                </Link>
              </div>
            ) : (
              <div className="dash-event-card">
                <div className="dash-event-title">NO UPCOMING EVENTS</div>
                <div className="dash-event-desc">Check back soon for new events.</div>
                <Link href="/events" className="lb-btn-ghost dash-event-cta">
                  ALL EVENTS →
                </Link>
              </div>
            )}
          </Brackets>

          <Brackets tag="leaderboard.you" accent="blue">
            <h2 className="dash-h">YOUR NEIGHBORHOOD</h2>
            <div className="dash-mini-board">
              {neighborhood.length > 0 ? (
                neighborhood.map((r, i) => (
                  <div
                    key={r.userId}
                    className={`dash-mini-row lb-c-${colorAt(i)}${r.userId === user.id ? " dash-mini-you" : ""}`}
                  >
                    <span className="lb-mono">#{r.rank}</span>
                    <span className={`lb-avatar-chip lb-c-${colorAt(i)}`} />
                    <span className="dash-mini-name">{r.name}{r.userId === user.id ? " (you)" : ""}</span>
                    <span className="lb-mono dash-mini-score">{r.xp.toLocaleString()}</span>
                  </div>
                ))
              ) : leaderboard && leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((r, i) => (
                  <div key={r.userId} className={`dash-mini-row lb-c-${colorAt(i)}`}>
                    <span className="lb-mono">#{r.rank}</span>
                    <span className={`lb-avatar-chip lb-c-${colorAt(i)}`} />
                    <span className="dash-mini-name">{r.name}</span>
                    <span className="lb-mono dash-mini-score">{r.xp.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="dash-mini-row lb-c-yellow">
                  <span className="lb-mono">—</span>
                  <span className="dash-mini-name">leaderboard loading…</span>
                  <span className="lb-mono dash-mini-score">—</span>
                </div>
              )}
            </div>
            <div className="dash-mini-foot">
              <Link href="/leaderboard" style={{ color: "var(--acc, #ffd93b)", textDecoration: "none" }}>
                view full leaderboard →
              </Link>
            </div>
          </Brackets>

          <Brackets tag="badges" accent="purple">
            <h2 className="dash-h">
              YOUR BADGES · {badgeCount} / 24
            </h2>
            <div className="dash-badges">
              {user.badges && user.badges.length > 0 ? (
                user.badges.slice(0, 10).map((b, i) => (
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
        </div>
      </section>

      <TesseractFooter context="dashboard" />
    </div>
  );
}
