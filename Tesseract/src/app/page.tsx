"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractHero } from "@/components/tesseract/TesseractHero";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { StatusOnline } from "@/components/tesseract/TesseractNav";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { dashboardApi, eventsApi, gamesApi } from "@/lib/api/services";
import type { Game, PublicDashboardSummary, TesseractEvent } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

const MODULES: {
  n: string;
  t: string;
  d: string;
  meta: string[];
  c: "red" | "green" | "blue" | "purple";
  href: string;
}[] = [
  {
    n: "01",
    t: "MINI-GAMES",
    d: "Riddles. Puzzles. Teasers. 5-minute dopamine for the break between lectures.",
    meta: ["solo", "daily", "ranked"],
    c: "red",
    href: "/games",
  },
  {
    n: "02",
    t: "MULTIPLAYER",
    d: "Scribbl lobbies, Smash Kart tournaments, whatever the group chat is obsessed with this week.",
    meta: ["party", "live", "chaotic"],
    c: "green",
    href: "/games",
  },
  {
    n: "03",
    t: "EVENTS",
    d: "Movie nights. Play nights. Community challenges. IRL and URL.",
    meta: ["weekly", "rsvp"],
    c: "blue",
    href: "/events",
  },
  {
    n: "04",
    t: "ESPORTS",
    d: "Seasonal cups. A global ladder. One leaderboard, every game.",
    meta: ["ranked", "seasonal"],
    c: "purple",
    href: "/leaderboard",
  },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function LandingPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [email, setEmail] = useState("");

  const { data: publicSummary, refetch: refetchSummary } = useApi<PublicDashboardSummary>(
    () => dashboardApi.publicSummary(),
    [],
  );

  // Public-friendly data: events list and games list (these endpoints are public)
  const { data: events } = useApi<TesseractEvent[]>(
    () => eventsApi.list({ pageSize: 4 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );
  const { data: games, refetch: refetchGames } = useApi<Game[]>(
    () => gamesApi.list({ pageSize: 6 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  // Poll real data every 20s to keep "online" count fresh
  useEffect(() => {
    const id = setInterval(() => {
      refetchSummary();
      refetchGames();
    }, 20000);
    return () => clearInterval(id);
  }, [refetchSummary, refetchGames]);

  const telemetryUsers = publicSummary?.totalUsers ?? 0;
  const telemetryGames = publicSummary?.totalGames ?? games?.length ?? 0;
  const telemetryEvents = publicSummary?.activeEvents ?? events?.length ?? 0;
  // Real online count: sum playersOnline from the top live games (backend-tracked)
  const activeSessions = publicSummary?.liveGames?.reduce((sum, game) => sum + game.playersOnline, 0) ?? 0;
  const online = activeSessions;

  const liveGames = publicSummary?.liveGames ?? [];
  const featuredEvent = events && events.length > 0 ? events[0] : null;
  const featuredGames = (games ?? []).slice(0, 3);

  const boardRows = publicSummary?.topPlayers && publicSummary.topPlayers.length > 0
    ? publicSummary.topPlayers.slice(0, 5).map((entry, i) => ({
        rank: String(entry.rank).padStart(2, "0"),
        name: entry.name,
        level: entry.level?.toLowerCase() ?? "—",
        xp: entry.xp,
        badge: entry.badge ? `#${entry.badge.toLowerCase()}` : "—",
        c: PALETTE[i % PALETTE.length],
      }))
    : [];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your institute email first");
      return;
    }
    if (!email.endsWith("@ds.study.iitm.ac.in") && !email.endsWith("@es.study.iitm.ac.in")) {
      toast.error("Only IITM BS student emails are allowed");
      return;
    }
    // Pre-fill email and route to /auth
    sessionStorage.setItem("tesseract.prefill_email", email);
    router.push("/auth");
  };

  const isLoggedIn = isHydrated && !!user;
  const isAdmin = isLoggedIn && user?.role === "admin";

  return (
    <div className="lb-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <nav className="lb-nav">
        <Link href="/" className="lb-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tesseract" className="lb-logo" />
          <div>
            <div className="lb-wordmark">TESSERACT</div>
            <div className="lb-wordmark-sub">{"// IITM_BS.community"}</div>
          </div>
        </Link>
        <div className="lb-nav-links">
          <Link href="/games">[01] games</Link>
          <Link href="/events">[02] events</Link>
          <Link href="/leaderboard">[03] ranks</Link>
          {isAdmin && <Link href="/members">[04] members</Link>}
        </div>
        <div className="lb-nav-cta">
          <StatusOnline online={online} />
          {isLoggedIn ? (
            <Link href="/dashboard" className="lb-btn-primary">
              ENTER DASHBOARD ▶
            </Link>
          ) : (
            <Link href="/auth" className="lb-btn-primary">
              INSERT COIN ▶
            </Link>
          )}
        </div>
      </nav>

      <div className="lb-gate-bar">
        <div className="lb-gate-item">
          <span className="lb-gate-label">ACCESS</span>
          <span className="lb-gate-val">restricted</span>
        </div>
        <div className="lb-gate-item">
          <span className="lb-gate-label">DOMAIN</span>
          <span className="lb-gate-val">@ds.study.iitm.ac.in</span>
        </div>
        <div className="lb-gate-item">
          <span className="lb-gate-label">DOMAIN</span>
          <span className="lb-gate-val">@es.study.iitm.ac.in</span>
        </div>
        <div className="lb-gate-item">
          <span className="lb-gate-label">EXT_USERS</span>
          <span className="lb-gate-val lb-deny">denied</span>
        </div>
        <div className="lb-gate-item lb-gate-flex">
          <span className="lb-gate-label">SESSION</span>
          <span className="lb-gate-val">tesseract.v1 · build 26.04</span>
        </div>
      </div>

      <section className="lb-hero">
        <div className="lb-hero-left">
          <div className="lb-hero-label">&gt; booting tesseract…</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">A PLACE TO</span>
            <span className="lb-h-line lb-h-accent">PLAY, PAUSE,</span>
            <span className="lb-h-line">AND BELONG.</span>
          </h1>
          <p className="lb-sub">
            A student-built community for IITM BS. Mini-games, movie nights,
            esports ladders, and the people who make the assignments bearable.
          </p>

          <div className="lb-cta-row">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="lb-btn-primary lb-btn-lg">
                  ▶ ENTER DASHBOARD
                </Link>
                <Link href="/games" className="lb-btn-ghost lb-btn-lg">
                  {"// browse games"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth" className="lb-btn-primary lb-btn-lg">
                  ▶ JOIN TESSERACT
                </Link>
                <Link href="/games" className="lb-btn-ghost lb-btn-lg">
                  {"// preview games"}
                </Link>
              </>
            )}
          </div>

          <Brackets tag="telemetry · live">
            <div className="lb-telemetry">
              <div className="lb-tel-row">
                <span className="lb-tel-k">members_total</span>
                <span className="lb-tel-v">{telemetryUsers.toLocaleString()}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">games_registered</span>
                <span className="lb-tel-v">{telemetryGames}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">events_active</span>
                <span className="lb-tel-v">{String(telemetryEvents).padStart(2, "0")}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">active_sessions</span>
                <span className="lb-tel-v">
                  <span className="lb-pulse" />
                  {activeSessions}
                </span>
              </div>
            </div>
          </Brackets>
        </div>

        <div className="lb-hero-right lb-hero-right-a" style={{ userSelect: "none" }}>
          <div className="la-viz-ring" />
          <div className="la-viz-ring-2" />
          <TesseractHero size={520} speed={1} glow />
          <div className="lb-viz-caption-a">a tesseract · 4D unfolded</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-jetbrains)", color: "rgba(255,255,255,0.28)", marginTop: 6, textAlign: "center", letterSpacing: "0.08em" }}>
            ⟳ hover to rotate
          </div>
        </div>
      </section>

      {/* Featured event teaser — only show if events exist */}
      {featuredEvent && (
        <section className="lb-board-section" style={{ paddingTop: 0 }}>
          <div className="lb-section-head">
            <div className="lb-kicker">{"// upcoming · feature"}</div>
            <h2 className="lb-section-title">WHAT&apos;S ON</h2>
            <Link href="/events" className="lb-kicker-right" style={{ color: "var(--acc, #ffd93b)", textDecoration: "none" }}>
              all events →
            </Link>
          </div>
          <Brackets tag={`event · ${featuredEvent.category}`} accent="red">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr auto",
                gap: 24,
                alignItems: "center",
                padding: "12px 4px",
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  background: "linear-gradient(135deg, rgba(255,59,59,0.2), rgba(255,59,59,0.05))",
                  border: "1px solid rgba(255,59,59,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-audiowide)",
                  fontSize: 28,
                  color: "#ff8a8a",
                }}
              >
                <div>{fmtDate(featuredEvent.startsAt).split(" ")[0]}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#ffd93b" }}>{fmtDate(featuredEvent.startsAt).split(" ")[1]}</div>
              </div>
              <div>
                <div className="lb-kicker">#{featuredEvent.category}</div>
                <h3 style={{ fontFamily: "var(--font-audiowide)", fontSize: 24, margin: "6px 0", color: "#fff" }}>
                  {featuredEvent.title.toUpperCase()}
                </h3>
                <p style={{ color: "#bbb", fontSize: 14, lineHeight: 1.6, maxWidth: 600 }}>
                  {featuredEvent.description}
                </p>
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#888", fontFamily: "var(--font-jetbrains)" }}>
                  <span>⏱ {fmtTime(featuredEvent.startsAt)} IST</span>
                  <span>◉ {featuredEvent.location}</span>
                  <span>👥 {featuredEvent.registered} going</span>
                </div>
              </div>
              <Link
                href={isLoggedIn ? `/events/${featuredEvent.id}` : "/auth"}
                className="lb-btn-primary"
              >
                {isLoggedIn ? "VIEW →" : "JOIN TO RSVP"}
              </Link>
            </div>
          </Brackets>
        </section>
      )}

      <section className="lb-modules">
        <div className="lb-section-head">
          <div className="lb-kicker">{"// modules"}</div>
          <h2 className="lb-section-title">WHAT RUNS ON TESSERACT</h2>
          <div className="lb-kicker-right">4 of 4 live</div>
        </div>

        <div className="lb-module-grid">
          {MODULES.map((m) => (
            <Link
              key={m.n}
              href={isLoggedIn ? m.href : "/auth"}
              className={`lb-module-wrap lb-c-${m.c}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Brackets tag={`module_${m.n}`}>
                <div className="lb-module">
                  <div className="lb-module-num">{m.n}</div>
                  <h3 className="lb-module-title">{m.t}</h3>
                  <p className="lb-module-desc">{m.d}</p>
                  <div className="lb-module-meta">
                    {m.meta.map((x) => (
                      <span key={x}>#{x}</span>
                    ))}
                  </div>
                  <div className="lb-module-link">ENTER →</div>
                </div>
              </Brackets>
            </Link>
          ))}
        </div>
      </section>

      {/* Live games strip — show when API has games */}
      {(featuredGames.length > 0 || liveGames.length > 0) && (
        <section className="lb-modules" style={{ paddingTop: 24 }}>
          <div className="lb-section-head">
            <div className="lb-kicker">{"// catalog · live"}</div>
            <h2 className="lb-section-title">WHAT&apos;S BEING PLAYED</h2>
            <Link href="/games" className="lb-kicker-right" style={{ color: "var(--acc, #ffd93b)", textDecoration: "none" }}>
              all games →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              padding: "0 60px",
            }}
          >
            {(featuredGames.length > 0 ? featuredGames : []).map((g, i) => {
              const c = colorAt(i);
              const live = liveGames.find((lg) => lg.id === g.id)?.playersOnline ?? g.playersOnline ?? 0;
              return (
                <Link
                  key={g.id}
                  href={isLoggedIn ? `/games/${g.id}` : "/auth"}
                  className={`lb-c-${c}`}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: 18,
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--acc, #ffd93b)";
                    e.currentTarget.style.background = "rgba(255,217,59,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--acc, #ffd93b)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      {g.emoji || g.name.charAt(0)}
                    </div>
                    {live > 0 && (
                      <div style={{ fontSize: 10, fontFamily: "var(--font-jetbrains)", color: "#5eff7a", display: "flex", alignItems: "center", gap: 4 }}>
                        <span className="lb-pulse" /> {live} LIVE
                      </div>
                    )}
                  </div>
                  <div className="lb-kicker" style={{ marginBottom: 4 }}>#{g.category}</div>
                  <div style={{ fontFamily: "var(--font-audiowide)", fontSize: 16, color: "#fff", marginBottom: 6 }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{g.tagline}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Leaderboard — only show if backend has data */}
      {boardRows.length > 0 && (
        <section className="lb-board-section">
          <div className="lb-section-head">
            <div className="lb-kicker">{"// leaderboard · live"}</div>
            <h2 className="lb-section-title">WHO&apos;S WINNING</h2>
            <Link href="/leaderboard" className="lb-kicker-right" style={{ color: "var(--acc, #ffd93b)", textDecoration: "none" }}>
              full board →
            </Link>
          </div>
          <Brackets tag="ranks.sorted()">
            <div className="lb-board">
              <div className="lb-board-head">
                <span>RANK</span>
                <span>PLAYER</span>
                <span>LEVEL</span>
                <span>SCORE</span>
                <span>BADGE</span>
              </div>
              {boardRows.map((r, i) => (
                <div
                  key={r.name}
                  className={`lb-board-row lb-c-${r.c}${i === 0 ? " lb-board-row-top" : ""}`}
                >
                  <span className="lb-mono lb-rank-pill">{r.rank}</span>
                  <span className="lb-board-player">
                    <span className={`lb-avatar-chip lb-c-${r.c}`} />
                    {r.name}
                  </span>
                  <span className="lb-mono lb-dim">{r.level}</span>
                  <span className="lb-mono lb-board-score">{r.xp.toLocaleString()}</span>
                  <span className="lb-mono lb-green">{r.badge}</span>
                </div>
              ))}
            </div>
          </Brackets>
        </section>
      )}

      {!isLoggedIn && (
        <section className="lb-join">
          <Brackets tag="auth · sign_in">
            <div className="lb-join-inner">
              <div className="lb-kicker">{"// entry_point"}</div>
              <h2 className="lb-join-title">
                ONE DOOR. <span className="lb-h-accent">INSTITUTE EMAIL ONLY.</span>
              </h2>
              <p className="lb-sub">
                Sign in with your IITM email + password, or continue with Google.
                Only @ds and @es addresses are accepted — anything else gets bounced.
              </p>
              <form className="lb-join-form" onSubmit={handleEmailSubmit}>
                <span className="lb-input-prefix">&gt;</span>
                <input
                  className="lb-input"
                  placeholder="you@ds.study.iitm.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
                <button className="lb-btn-primary" type="submit">
                  CONTINUE →
                </button>
              </form>
              <div className="lb-join-steps">
                <div>
                  <span>01</span> enter email
                </div>
                <div>
                  <span>02</span> password or google
                </div>
                <div>
                  <span>03</span> request membership
                </div>
                <div>
                  <span>04</span> climb the board
                </div>
              </div>
            </div>
          </Brackets>
        </section>
      )}

      <TesseractFooter context="platform" />
    </div>
  );
}
