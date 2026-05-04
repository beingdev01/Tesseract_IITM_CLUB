"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { leaderboardApi } from "@/lib/api/services";
import { formatNumber } from "@/lib/utils";

export function CommunityVibe() {
  const leaderboard = useApi(() => leaderboardApi.global({ pageSize: 6 }), []);

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-neon-yellow">
          / live leaderboard
        </p>
        <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
          Who is setting the pace.
        </h2>
      </div>

      <div className="relative mt-12 mask-fade-x">
        {leaderboard.loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : !leaderboard.data?.length ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-white/70">
              Rankings will show up here as soon as the first verified players start competing.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
          >
            {leaderboard.data.map((entry) => (
              <div
                key={entry.userId}
                className="glass rounded-2xl p-5 hover-lift"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={entry.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{entry.name}</p>
                    <p className="text-xs text-white/50">
                      Level {entry.level}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 text-neon-yellow">
                    <Trophy className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/45">
                      Rank
                    </p>
                    <p className="mt-1 font-display text-2xl text-white">
                      #{entry.rank}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-white/45">
                      XP
                    </p>
                    <p className="mt-1 font-mono text-lg text-white/80">
                      {formatNumber(entry.xp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
