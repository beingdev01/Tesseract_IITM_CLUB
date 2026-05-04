"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brackets } from "@/components/tesseract/Brackets";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { gamesApi, leaderboardApi } from "@/lib/api/services";
import type { Game, LeaderboardEntry } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<string>("global");

  useEffect(() => {
    if (isHydrated && !user) router.replace("/auth");
  }, [isHydrated, user, router]);

  const { data: games } = useApi<Game[]>(
    () => gamesApi.list({ pageSize: 6 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  const { data: globalBoard, loading: globalLoading } = useApi<LeaderboardEntry[]>(
    () => leaderboardApi.global({ pageSize: 50 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  const { data: gameBoard, loading: gameBoardLoading } = useApi<LeaderboardEntry[]>(
    () => activeFilter === "global"
      ? Promise.resolve([])
      : leaderboardApi.forGame(activeFilter, { pageSize: 50 }).then((r) => (Array.isArray(r) ? r : [])),
    [activeFilter],
  );

  if (!isHydrated || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  const board = activeFilter === "global" ? globalBoard : gameBoard;
  const loading = activeFilter === "global" ? globalLoading : gameBoardLoading;
  const top3 = (board ?? []).slice(0, 3);
  const rest = (board ?? []).slice(3, 12);
  const userEntry = (board ?? []).find((e) => e.userId === user.id);

  const filters: { key: string; label: string; c: Color }[] = [
    { key: "global", label: "global", c: "yellow" },
    ...(games ?? []).slice(0, 4).map((g, i) => ({
      key: g.id,
      label: g.name.toLowerCase(),
      c: colorAt(i + 1),
    })),
  ];

  return (
    <div className="lb-root rank-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// leaderboard.global"
        active="ranks"
        cta={<MeChip />}
      />

      <section className="rank-hero">
        <div>
          <div className="lb-kicker">{"// season_03 · live"}</div>
          <h1 className="rank-title">
            THE <span className="lb-h-accent">TOP TWELVE</span>
          </h1>
          <p className="lb-sub">
            Ranks update in real time. Top 3 get permanent badges. Climb fast.
          </p>
        </div>
        <div className="rank-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`games-cat lb-c-${f.c}${activeFilter === f.key ? " active" : ""}`}
            >
              <span className="games-cat-name">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="rank-podium-section">
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
            <div className="lb-kicker">{"// loading_ranks"}</div>
          </div>
        </section>
      ) : top3.length === 0 ? (
        <section className="rank-podium-section">
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
            <div className="lb-kicker" style={{ marginBottom: "12px" }}>{"// no_data_yet"}</div>
            <p>The leaderboard is empty. Be the first to score.</p>
          </div>
        </section>
      ) : (
        <section className="rank-podium-section">
          <div className="rank-podium">
            {top3.map((p, i) => {
              const c = colorAt(i);
              return (
                <div
                  key={p.userId}
                  className={`rank-podium-card lb-c-${c} rank-pos-${p.rank}`}
                >
                  <div className="rank-podium-rank">#{p.rank}</div>
                  <div className={`rank-podium-avatar lb-c-${c}`}>
                    <span className="rank-podium-letter">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="rank-podium-name">{p.name}</div>
                  <div className="rank-podium-batch">{p.level}</div>
                  <div className="rank-podium-pts">{p.xp.toLocaleString()}</div>
                  <div className="rank-podium-meta">
                    <span>
                      <b>{p.delta > 0 ? `+${p.delta}` : p.delta}</b> 24h
                    </span>
                    {p.badge && (
                      <span>
                        <b>{p.badge}</b>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rank-rest">
        <Brackets tag="ranks · 4-12">
          <div className="rank-table">
            <div className="rank-table-head">
              <span>RANK</span>
              <span>PLAYER</span>
              <span>LEVEL</span>
              <span>DELTA</span>
              <span>BADGE</span>
              <span>POINTS</span>
            </div>
            {rest.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#888" }}>
                Not enough players to fill ranks 4–12 yet.
              </div>
            ) : (
              rest.map((r, i) => {
                const c = colorAt(i + 3);
                return (
                  <div key={r.userId} className={`rank-table-row lb-c-${c}`}>
                    <span className="lb-rank-pill">#{r.rank}</span>
                    <span className="rank-table-player">
                      <span className={`lb-avatar-chip lb-c-${c}`} />
                      <span>{r.name}</span>
                    </span>
                    <span className="lb-mono lb-dim">{r.level}</span>
                    <span className="lb-mono">{r.delta > 0 ? `+${r.delta}` : r.delta}</span>
                    <span className="lb-mono">{r.badge ?? "—"}</span>
                    <span className="lb-mono rank-table-pts">
                      {r.xp.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Brackets>

        <div className="rank-you-strip">
          <div className="rank-you-label">{"// your_position"}</div>
          {userEntry ? (
            <div className="rank-you-row lb-c-yellow">
              <span className="lb-rank-pill">#{userEntry.rank}</span>
              <span className="rank-table-player">
                <span className="lb-avatar-chip lb-c-yellow" />
                <span>{user.name} (you)</span>
              </span>
              <span className="lb-mono lb-dim">{userEntry.level}</span>
              <span className="lb-mono">{userEntry.delta > 0 ? `+${userEntry.delta}` : userEntry.delta}</span>
              <span className="lb-mono">{userEntry.badge ?? "—"}</span>
              <span className="lb-mono rank-table-pts">{userEntry.xp.toLocaleString()}</span>
            </div>
          ) : (
            <div className="rank-you-row lb-c-yellow">
              <span className="lb-rank-pill">#{user.rank ?? "—"}</span>
              <span className="rank-table-player">
                <span className="lb-avatar-chip lb-c-yellow" />
                <span>{user.name} (you)</span>
              </span>
              <span className="lb-mono lb-dim">{user.level ?? "—"}</span>
              <span className="lb-mono">—</span>
              <span className="lb-mono">—</span>
              <span className="lb-mono rank-table-pts">{(user.xp ?? 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      </section>

      <TesseractFooter context="ranks" />
    </div>
  );
}
