"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isHydrated, initialRefreshDone } = useAuthStore();
  const [favorite, setFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isHydrated || !initialRefreshDone) return;
    if (!user) router.replace("/auth");
  }, [isHydrated, initialRefreshDone, user, router]);

  const { data: game, loading, error } = useApi<Game>(() => gamesApi.get(id), [id]);
  const { data: gameLeaderboard } = useApi<LeaderboardEntry[]>(
    () => leaderboardApi.forGame(id, { pageSize: 10 }).then((r) => (Array.isArray(r) ? r : [])),
    [id],
  );

  if (!isHydrated || !initialRefreshDone || !user) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading…</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="lb-kicker">loading game…</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="lb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <div className="lb-kicker">{"// game_not_found"}</div>
        <p>{error?.message ?? "This game does not exist."}</p>
        <Link href="/games" className="lb-btn-ghost">← all games</Link>
      </div>
    );
  }

  const c: Color = "red";
  const live = game.playersOnline ?? 0;
  const isHot = live > 5;

  const handlePlay = async () => {
    if (user.role === "guest") {
      toast.error("Membership approval required to play.");
      return;
    }
    setSubmitting(true);
    try {
      // Phase 1: score submission may be disabled. Surface a toast either way.
      const result = await gamesApi.submitScore(game.id, 100);
      toast.success(`Game launched! ${result.xpAwarded > 0 ? `+${result.xpAwarded} XP` : ""}`);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Could not start game";
      toast(msg, { icon: "🎮" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFavorite = () => {
    setFavorite((v) => !v);
    toast.success(favorite ? "Removed from favorites" : "Added to favorites");
  };

  return (
    <div className="lb-root gd-root">
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <TesseractNav
        subline={`// games · ${game.name.toLowerCase()}`}
        active="games"
        cta={<MeChip />}
      />

      {/* Hero band */}
      <section className={`gd-hero lb-c-${c}`}>
        <div className="gd-hero-art">
          <span className="gd-hero-letter">{game.emoji || game.name.charAt(0)}</span>
          <div className="gd-hero-art-grid" />
          {isHot && <div className="gd-hero-hot">▲ HOT</div>}
        </div>
        <div className="gd-hero-info">
          <div className="lb-kicker">{"// " + game.category}</div>
          <h1 className="gd-hero-title">{game.name}</h1>
          <p className="gd-hero-desc">{game.tagline || game.description}</p>
          <div className="gd-hero-stats">
            <div className="gd-stat">
              <span>DIFFICULTY</span>
              <b>{game.difficulty}</b>
            </div>
            <div className="gd-stat">
              <span>HIGH SCORE</span>
              <b>{game.highScore?.toLocaleString() ?? "—"}</b>
            </div>
            <div className="gd-stat">
              <span>ONLINE NOW</span>
              <b className={live > 0 ? "lb-green" : ""}>
                {live > 0 ? `${live} players` : "none"}
              </b>
            </div>
            <div className="gd-stat">
              <span>XP REWARD</span>
              <b>{game.xpReward}</b>
            </div>
          </div>
          <div className="gd-hero-actions">
            <button className="lb-btn-primary lb-btn-lg" onClick={handlePlay} disabled={submitting}>
              {submitting ? "STARTING…" : "PLAY ▶"}
            </button>
            <button className="lb-btn-ghost lb-btn-lg" onClick={handleFavorite}>
              {favorite ? "★ FAVORITED" : "ADD TO FAVORITES"}
            </button>
            <Link href="/games" className="lb-btn-ghost lb-btn-lg">
              ← ALL GAMES
            </Link>
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <section className="gd-main">
        <div className="gd-col-l">
          <Brackets tag="how.to.play" accent={c}>
            <h2 className="dash-h">RULES + HOW TO PLAY</h2>
            {game.howToPlay && game.howToPlay.length > 0 && (
              <>
                <h3 className="evd-rules-title">HOW TO PLAY</h3>
                <ol className="gd-rules">
                  {game.howToPlay.map((r, i) => (
                    <li key={i} className="gd-rule">
                      <span className="gd-rule-num">{String(i + 1).padStart(2, "0")}</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {game.rules && game.rules.length > 0 && (
              <>
                <h3 className="evd-rules-title" style={{ marginTop: "20px" }}>RULES</h3>
                <ol className="gd-rules">
                  {game.rules.map((r, i) => (
                    <li key={i} className="gd-rule">
                      <span className="gd-rule-num">{String(i + 1).padStart(2, "0")}</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {(!game.howToPlay || game.howToPlay.length === 0) &&
             (!game.rules || game.rules.length === 0) && (
              <p style={{ color: "#888" }}>{game.description}</p>
            )}
          </Brackets>

          <Brackets tag="about.the.game" accent="yellow">
            <h2 className="dash-h">DESCRIPTION</h2>
            <p style={{ lineHeight: 1.8, color: "#bbb" }}>{game.description}</p>
            {game.bestPlayer && (
              <p style={{ marginTop: 16, color: "var(--acc, #ffd93b)" }}>
                Reigning champion: <b>{game.bestPlayer}</b>
              </p>
            )}
          </Brackets>
        </div>

        <div className="gd-col-r">
          <Brackets tag="leaderboard" accent="blue">
            <h2 className="dash-h">TOP PLAYERS · {game.name.toUpperCase()}</h2>
            <div className="dash-mini-board">
              {gameLeaderboard && gameLeaderboard.length > 0 ? (
                gameLeaderboard.map((r, i) => (
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
                  <span className="dash-mini-name">no scores yet · be first</span>
                  <span className="lb-mono dash-mini-score">—</span>
                </div>
              )}
            </div>
          </Brackets>

          <div className={`gd-cta-card lb-c-${c}`}>
            <div className="gd-cta-label">{"// ready to play?"}</div>
            <div className="gd-cta-title">{game.name}</div>
            <div className="gd-cta-meta">
              {live} online · #{game.category}
            </div>
            <button className="lb-btn-primary lb-btn-lg gd-cta-btn" onClick={handlePlay} disabled={submitting}>
              {submitting ? "STARTING…" : "LAUNCH GAME ▶"}
            </button>
            {live > 0 && (
              <div className="gd-cta-live">
                <span className="lb-pulse" />
                {live} players online now
              </div>
            )}
          </div>
        </div>
      </section>

      <TesseractFooter context="games" />
    </div>
  );
}
