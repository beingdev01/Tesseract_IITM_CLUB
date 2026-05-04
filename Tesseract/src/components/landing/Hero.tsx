"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Sparkles, Trophy, Users } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { dashboardApi } from "@/lib/api/services";
import { formatNumber } from "@/lib/utils";

export function Hero() {
  const summary = useApi(() => dashboardApi.publicSummary(), []);

  return (
    <section className="relative isolate mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[40rem] w-[70rem] max-w-none bg-aurora blur-2xl mask-fade-b opacity-80" />

      <motion.div
        className="mx-auto flex max-w-3xl flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Pill tone="purple" pulse className="mb-6">
          <Sparkles className="h-3 w-3" />
          Closed beta — IITM BS only
        </Pill>

        <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-white sm:text-7xl">
          Play. Compete.
          <br />
          <span className="text-gradient">Belong.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
          Tesseract is the gamified home for IIT Madras BS students — a single
          hub for events, games, leaderboards, and everyone you've been meaning
          to meet on Discord.
        </p>

        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Link href="/auth">
            <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Join Tesseract
            </Button>
          </Link>
          <Link href="/games">
            <Button size="lg" variant="secondary" leftIcon={<Gamepad2 className="h-4 w-4" />}>
              Browse games
            </Button>
          </Link>
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <Stat
            icon={<Users className="h-4 w-4 text-neon-yellow" />}
            label={
              summary.data
                ? `${formatNumber(summary.data.totalUsers)} verified players`
                : "Verified IITM cohort"
            }
          />
          <Stat
            icon={<Gamepad2 className="h-4 w-4 text-neon-cyan" />}
            label={
              summary.data
                ? `${formatNumber(summary.data.totalGames)} games live`
                : "Competitive games"
            }
          />
          <Stat
            icon={<Sparkles className="h-4 w-4 text-neon-pink" />}
            label={
              summary.data
                ? `${formatNumber(summary.data.activeEvents)} active events`
                : "Events and leaderboards"
            }
          />
        </div>
      </motion.div>

      <HeroPanel
        loading={summary.loading}
        topPlayers={summary.data?.topPlayers ?? []}
        liveGames={summary.data?.liveGames ?? []}
        totalUsers={summary.data?.totalUsers ?? 0}
        totalGames={summary.data?.totalGames ?? 0}
        activeEvents={summary.data?.activeEvents ?? 0}
      />
    </section>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {label}
    </span>
  );
}

function HeroPanel({
  loading,
  topPlayers,
  liveGames,
  totalUsers,
  totalGames,
  activeEvents,
}: {
  loading: boolean;
  topPlayers: {
    rank: number;
    name: string;
    avatar?: string;
    xp: number;
    level: string;
    badge?: string;
  }[];
  liveGames: {
    id: string;
    name: string;
    emoji: string;
    playersOnline: number;
  }[];
  totalUsers: number;
  totalGames: number;
  activeEvents: number;
}) {
  return (
    <motion.div
      className="relative mx-auto mt-16 max-w-5xl"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="relative glass-strong rounded-3xl ring-gradient shadow-glow-lg p-4 sm:p-5">
        <div className="flex items-center gap-1.5 pl-1">
          <span className="h-3 w-3 rounded-full bg-neon-red/80" />
          <span className="h-3 w-3 rounded-full bg-neon-yellow/80" />
          <span className="h-3 w-3 rounded-full bg-neon-green/80" />
          <span className="ml-auto text-[10px] tracking-wider text-white/40 font-mono">
            tesseract.iitm.app/live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))
          ) : (
            <>
              <MiniCard title="Players" value={formatNumber(totalUsers)} trend="Verified accounts" tone="purple" />
              <MiniCard title="Games" value={formatNumber(totalGames)} trend="Playable right now" tone="cyan" />
              <MiniCard title="Events" value={formatNumber(activeEvents)} trend="Upcoming or live" tone="green" />
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-3 rounded-2xl glass p-5">
            <p className="font-display text-sm tracking-wide text-white/90">
              Top players
            </p>
            {loading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : topPlayers.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {topPlayers.map((player) => (
                  <li key={player.rank} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <span className="w-6 font-display text-sm text-white/70">#{player.rank}</span>
                    <Avatar name={player.name} src={player.avatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        {player.name}
                        {player.badge ? <span className="ml-1.5">{player.badge}</span> : null}
                      </p>
                      <p className="text-[11px] text-white/45">{player.level}</p>
                    </div>
                    <span className="font-mono text-xs text-white/70">
                      {formatNumber(player.xp)} XP
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-white/50">
                The leaderboard fills up as the first players submit scores.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 rounded-2xl glass p-5">
            <p className="font-display text-sm tracking-wide text-white/90">
              Live now
            </p>
            {loading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-xl" />
                ))}
              </div>
            ) : liveGames.length > 0 ? (
              <ul className="mt-3 space-y-2.5 text-sm">
                {liveGames.map((game) => (
                  <li key={game.id} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-lg">
                      {game.emoji}
                    </span>
                    <span className="text-white/80">{game.name}</span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-neon-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
                      {formatNumber(game.playersOnline)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-white/50">
                Live player counts will appear here once games are registered.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniCard({
  title,
  value,
  trend,
  tone,
}: {
  title: string;
  value: string;
  trend: string;
  tone: "purple" | "cyan" | "green";
}) {
  const toneMap = {
    purple: "from-neon-purple/40 to-transparent",
    cyan: "from-neon-cyan/40 to-transparent",
    green: "from-neon-green/40 to-transparent",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl glass p-5">
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${toneMap[tone]} blur-2xl`}
      />
      <p className="relative text-xs uppercase tracking-widest text-white/50">
        {title}
      </p>
      <p className="relative mt-2 font-display text-3xl text-white">{value}</p>
      <p className="relative mt-1 text-xs text-white/50">{trend}</p>
    </div>
  );
}
