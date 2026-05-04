"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { gamesApi } from "@/lib/api/services";
import { formatNumber } from "@/lib/utils";

export function GamesPreview() {
  const { data, loading } = useApi(
    () => gamesApi.list({ pageSize: 4 }),
    [],
  );
  const games = (data ?? []).slice(0, 4);

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-pink">
            / games live now
          </p>
          <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
            Pick a game. Climb the board.
          </h2>
        </div>
        <Link
          href="/games"
          className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          Browse all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-2xl" />
          ))
        ) : games.length > 0 ? (
          games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
            >
              <Card hover padding="sm" className="group h-full">
                <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-br from-neon-purple/20 via-neon-cyan/10 to-neon-green/10">
                  <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-30" />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center text-7xl"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {game.emoji}
                  </motion.div>
                  <div className="absolute top-3 right-3">
                    <Pill tone="green" pulse>
                      {formatNumber(game.playersOnline)} live
                    </Pill>
                  </div>
                </div>
                <div className="mt-4 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base text-white">{game.name}</h3>
                    <Pill tone="purple">{game.difficulty}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-white/60 truncate">{game.tagline}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3 w-3 text-neon-orange" />
                      {formatNumber(game.highScore)}
                    </span>
                    <span>{game.bestPlayer ? `by ${game.bestPlayer}` : "Waiting for first run"}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="sm:col-span-2 lg:col-span-4">
            <p className="text-sm text-white/60">
              Games will appear here once the first catalogue is published.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
