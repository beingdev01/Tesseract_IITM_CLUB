"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Crown, Minus, Trophy } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { gamesApi, leaderboardApi } from "@/lib/api/services";
import { useAuthStore } from "@/store/authStore";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

export function LeaderboardView() {
  const [scope, setScope] = useState<string>("global");
  const user = useAuthStore((s) => s.user);
  const games = useApi(() => gamesApi.list({ pageSize: 4 }), []);

  const fetcher = useMemo(
    () => () =>
      scope === "global"
        ? leaderboardApi.global()
        : leaderboardApi.forGame(scope),
    [scope],
  );

  const { data, loading, refreshing, refetch, error, lastLoadedAt } = useApi(fetcher, [scope]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void refetch();
    }, 12000);
    return () => window.clearInterval(t);
  }, [refetch]);

  const tabs = [
    { id: "global", label: "Global" },
    ...(games.data ?? []).slice(0, 4).map((game) => ({ id: game.id, label: game.name })),
  ];

  const podium = (data ?? []).slice(0, 3);
  const rest = (data ?? []).slice(3);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-yellow">
            / leaderboard
          </p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            The board is live. So are they.
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Auto-refreshes every 12s. Climb overnight, flex by morning.
          </p>
          {lastLoadedAt && (
            <p className="mt-1 text-xs text-white/40">Updated {relativeTime(new Date(lastLoadedAt))}</p>
          )}
          {error && (
            <p className="mt-1 text-xs text-neon-red/90">Refresh failed. Showing last known board.</p>
          )}
        </div>
        <Pill tone={error ? "red" : "green"} pulse={refreshing || !error}>
          {refreshing ? "Syncing" : error ? "Stale" : "Realtime"}
        </Pill>
      </header>

      <Tabs value={scope} onChange={setScope} items={tabs} />

      {loading && !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3 items-end">
            {podium[1] && <PodiumCard entry={podium[1]} place={2} />}
            {podium[0] && <PodiumCard entry={podium[0]} place={1} />}
            {podium[2] && <PodiumCard entry={podium[2]} place={3} />}
          </section>

          <Card padding="none" className="overflow-hidden">
            <div className="grid grid-cols-[52px_1fr_90px_90px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[11px] uppercase tracking-widest text-white/50">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">XP</span>
              <span className="text-right">Δ 24h</span>
            </div>
            <AnimatePresence initial={false}>
              {rest.map((e) => (
                <motion.div
                  key={`${scope}-${e.userId}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "group grid grid-cols-[52px_1fr_90px_90px] items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors",
                    e.userId === user?.id
                      ? "bg-gradient-to-r from-neon-purple/15 to-transparent"
                      : "hover:bg-white/[0.03]",
                  )}
                >
                  <span className="font-display text-sm text-white/80 tabular-nums">
                    #{e.rank}
                  </span>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={e.name} src={e.avatar} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {e.userId === user?.id ? "You" : e.name}
                        {e.badge && <span className="ml-1.5">{e.badge}</span>}
                      </p>
                      <p className="text-[11px] text-white/45">{e.level}</p>
                    </div>
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums text-white/90">
                    {formatNumber(e.xp)}
                  </span>
                  <DeltaCell delta={e.delta} />
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        </>
      )}
    </div>
  );
}

function DeltaCell({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center justify-end gap-1 text-xs text-white/45">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "flex items-center justify-end gap-1 text-xs",
        up ? "text-neon-green" : "text-neon-red",
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  );
}

function PodiumCard({
  entry,
  place,
}: {
  entry: { name: string; avatar?: string; xp: number; level: string };
  place: 1 | 2 | 3;
}) {
  const h = place === 1 ? "h-56" : "h-44";
  const grad =
    place === 1
      ? "from-neon-yellow/30 via-neon-orange/20 to-neon-purple/10"
      : place === 2
        ? "from-neon-cyan/25 via-neon-blue/15 to-transparent"
        : "from-neon-pink/25 via-neon-red/15 to-transparent";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: place * 0.05 }}
      className={cn("relative", place === 1 && "pt-5")}
    >
      {place === 1 && (
        <motion.div
          className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2"
          animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Crown className="h-8 w-8 text-neon-yellow drop-shadow-[0_0_10px_rgba(255,217,61,0.8)]" />
        </motion.div>
      )}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl glass ring-gradient p-5 text-center",
          h,
        )}
      >
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", grad)} />
        <div className="relative mt-6 flex flex-col items-center">
          <Avatar name={entry.name} src={entry.avatar} size={place === 1 ? 72 : 56} ring />
          <p className="mt-3 font-display text-base text-white">{entry.name}</p>
          <p className="text-xs text-white/60">{entry.level}</p>
          <p className="mt-3 font-mono text-lg tabular-nums text-gradient-static">
            {formatNumber(entry.xp)} XP
          </p>
          <Pill tone={place === 1 ? "yellow" : place === 2 ? "cyan" : "pink"} className="mt-3">
            <Trophy className="h-3 w-3" /> #{place}
          </Pill>
        </div>
      </div>
    </motion.div>
  );
}
