"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TesseractFooter } from "@/components/tesseract/TesseractFooter";
import { MeChip, TesseractNav } from "@/components/tesseract/TesseractNav";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { gamesApi } from "@/lib/api/services";
import type { Game } from "@/lib/types";

type Color = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
const PALETTE: Color[] = ["red", "yellow", "green", "blue", "purple", "orange"];
const colorAt = (i: number): Color => PALETTE[i % PALETTE.length];

export default function GamesPage() {
  const router = useRouter();
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [active, setActive] = useState("all");

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: games, loading, refetch: refetchGames } = useApi<Game[]>(
    () => gamesApi.list({ pageSize: 100 }).then((r) => (Array.isArray(r) ? r : [])),
    [],
  );

  // Poll for live player counts every 30s
  useEffect(() => {
    const id = setInterval(refetchGames, 30000);
    return () => clearInterval(id);
  }, [refetchGames]);

  const categories = useMemo(() => {
    if (!games) return [["all", "all_games", "yellow", 0]] as [string, string, Color, number][];
    const counts: Record<string, number> = { all: games.length };
    for (const g of games) counts[g.category] = (counts[g.category] ?? 0) + 1;
    const cats: [string, string, Color, number][] = [["all", "all_games", "yellow", counts.all]];
    Object.keys(counts).filter((k) => k !== "all").forEach((cat, i) => {
      cats.push([cat, cat, colorAt(i + 1), counts[cat]]);
    });
    return cats;
  }, [games]);

  const filtered = useMemo(() => {
    if (!games) return [];
    return active === "all" ? games : games.filter((g) => g.category === active);
  }, [games, active]);

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  return (
    <div className="lb-root games-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline="// games.hub"
        active="games"
        cta={
          <>
            {(user.role === "core" || user.role === "admin") && (
              <button className="lb-btn-ghost">+ SUBMIT GAME</button>
            )}
            <MeChip />
          </>
        }
      />

      <section className="games-hero">
        <div>
          <div className="lb-kicker">{"// catalog.v1"}</div>
          <h1 className="games-title">
            PICK YOUR <span className="lb-h-accent">POISON.</span>
          </h1>
          <p className="lb-sub">
            {games ? `${games.length} games registered.` : "Loading catalog…"} New ones drop monthly. Submit yours via the
            core team.
          </p>
        </div>
        <div className="games-cats">
          {categories.map((c) => (
            <button
              key={c[0]}
              onClick={() => setActive(c[0])}
              className={`games-cat lb-c-${c[2]}${active === c[0] ? " active" : ""}`}
            >
              <span className="games-cat-name">{c[1]}</span>
              <span className="games-cat-count">{c[3]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="games-grid">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className={`games-card lb-c-${colorAt(i)}`} style={{ opacity: 0.4 }}>
              <div className="games-card-art">
                <span className="games-art-letter">·</span>
                <div className="games-art-grid" />
              </div>
              <div className="games-card-body">
                <div className="games-card-cat">#loading</div>
                <h3 className="games-card-title">— — —</h3>
                <p className="games-card-desc">Loading…</p>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "#888" }}>
            <div className="lb-kicker" style={{ marginBottom: "12px" }}>{"// no_games_yet"}</div>
            <p>No games found in this category.</p>
          </div>
        ) : (
          filtered.map((g, i) => {
            const c = colorAt(i);
            const live = g.playersOnline ?? 0;
            const isHot = live > 5;
            return (
              <div key={g.id} className={`games-card lb-c-${c}`}>
                <div className="games-card-art">
                  <span className="games-art-letter">{g.emoji || g.name.charAt(0)}</span>
                  <div className="games-art-grid" />
                  {isHot && <div className="games-card-hot">▲ HOT</div>}
                  {live > 0 && (
                    <div className="games-card-live">
                      <span /> {live} LIVE
                    </div>
                  )}
                </div>
                <div className="games-card-body">
                  <div className="games-card-cat">#{g.category}</div>
                  <h3 className="games-card-title">{g.name}</h3>
                  <p className="games-card-desc">{g.tagline || g.description}</p>
                  <div className="games-card-stats">
                    <span>
                      <b>{live}</b> online
                    </span>
                    <span>
                      <b>{g.highScore?.toLocaleString() ?? 0}</b> high
                    </span>
                  </div>
                  <div className="games-card-actions">
                    <Link href={`/games/${g.id}`} className="lb-btn-primary games-card-btn">
                      PLAY ▶
                    </Link>
                    <Link href={`/games/${g.id}`} className="lb-btn-ghost games-card-btn">
                      RANKS
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <TesseractFooter context="games" />
    </div>
  );
}
