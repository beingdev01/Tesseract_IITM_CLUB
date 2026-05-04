"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Gamepad2, Play, Search, Trophy } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameModal } from "./GameModal";
import { useApi } from "@/hooks/useApi";
import { gamesApi } from "@/lib/api/services";
import type { Game } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const DIFF_TONE: Record<string, "green" | "yellow" | "red" | "purple"> = {
  easy: "green",
  medium: "yellow",
  hard: "red",
  nightmare: "purple",
};

export function GamesView() {
  const { data, loading } = useApi(() => gamesApi.list(), []);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Game | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((g) => set.add(g.category));
    return ["all", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list
      .filter((g) => category === "all" || g.category === category)
      .filter((g) =>
        query.length === 0
          ? true
          : `${g.name} ${g.tagline} ${g.category}`.toLowerCase().includes(query.toLowerCase()),
      );
  }, [data, category, query]);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-neon-pink">
          / games
        </p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
          Queue up. Climb the board.
        </h1>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={category}
          onChange={setCategory}
          items={categories.map((c) => ({ id: c, label: c === "all" ? "All" : c }))}
        />
        <div className="w-full sm:w-72">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Search games…"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 className="h-6 w-6" />}
          title="No games match"
          description="We're cooking more. Reset filters while you wait."
          action={
            <Button variant="secondary" onClick={() => { setCategory("all"); setQuery(""); }}>
              Reset
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Card
                hover
                padding="sm"
                className="group h-full cursor-pointer"
                onClick={() => setSelected(g)}
              >
                <div className="relative h-44 overflow-hidden rounded-xl bg-gradient-to-br from-neon-purple/25 via-neon-cyan/15 to-neon-green/15">
                  <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-30" />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center text-7xl"
                    whileHover={{ scale: 1.1, rotate: 4 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    {g.emoji}
                  </motion.div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Pill tone={DIFF_TONE[g.difficulty]}>{g.difficulty}</Pill>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Pill tone="green" pulse>{formatNumber(g.playersOnline)} live</Pill>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink-950/90 to-transparent p-3">
                    <div>
                      <p className="font-display text-base text-white">{g.name}</p>
                      <p className="text-[11px] text-white/60">{g.tagline}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan shadow-glow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-4 w-4 text-white" fill="currentColor" />
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-neon-orange" />
                    {formatNumber(g.highScore)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-neon-yellow" />
                    {g.bestPlayer}
                  </span>
                  <Pill tone="yellow">+{g.xpReward} XP</Pill>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <GameModal game={selected} onClose={() => setSelected(null)} onFinish={() => toast.success("Score submitted!")} />
    </div>
  );
}
