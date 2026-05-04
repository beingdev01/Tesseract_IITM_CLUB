"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Flame,
  Gamepad2,
  Rocket,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { dashboardApi, eventsApi, activityApi, leaderboardApi } from "@/lib/api/services";
import { formatDate, relativeTime, cn } from "@/lib/utils";

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const stats = useApi(() => dashboardApi.stats(), []);
  const events = useApi(() => eventsApi.list(), []);
  const activity = useApi(() => activityApi.feed(user?.id), [user?.id]);
  const leaderboard = useApi(() => leaderboardApi.global(), []);

  const hour = new Date().getHours();
  const greet =
    hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Burning midnight";

  const upcoming = (events.data ?? []).filter((e) => e.status !== "completed").slice(0, 3);
  const myRank = leaderboard.data?.find((e) => e.userId === user?.id);
  const totalRankedPlayers = leaderboard.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
            / mission control
          </p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            {greet}, <span className="text-gradient-static">{user?.name?.split(" ")[0] ?? "Player"}</span>.
          </h1>
          <p className="mt-1 text-sm text-white/60">
            You're on a {user?.streak ?? 0}-day streak. Don't break it on a Thursday.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/events">
            <Button variant="secondary" leftIcon={<Calendar className="h-4 w-4" />}>
              Events
            </Button>
          </Link>
          <Link href="/games">
            <Button leftIcon={<Gamepad2 className="h-4 w-4" />}>
              Play a game
            </Button>
          </Link>
        </div>
      </motion.header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.loading || !stats.data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          <>
            <StatCard
              label="Total XP"
              value={stats.data.totalXP}
              icon={<Zap className="h-5 w-5 text-neon-yellow" />}
              delta={user?.level ? `Current level: ${user.level}` : "Progress tracked in real time"}
              tone="yellow"
            />
            <StatCard
              label="Events joined"
              value={stats.data.eventsJoined}
              icon={<Calendar className="h-5 w-5 text-neon-cyan" />}
              delta={upcoming.length > 0 ? `${upcoming.length} upcoming on your radar` : "No upcoming RSVPs yet"}
              tone="cyan"
            />
            <StatCard
              label="Games played"
              value={stats.data.gamesPlayed}
              icon={<Gamepad2 className="h-5 w-5 text-neon-purple" />}
              delta={stats.data.gamesPlayed > 0 ? "Every score submission is tracked" : "Your arcade history starts here"}
              tone="purple"
            />
            <StatCard
              label="Global rank"
              value={`#${stats.data.rank}`}
              icon={<Trophy className="h-5 w-5 text-neon-pink" />}
              delta={totalRankedPlayers > 0 ? `Live among ${totalRankedPlayers} ranked players` : "Leaderboard will update after the first scores land"}
              tone="pink"
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weekly XP"
            subtitle="Seven days of progress, stacked."
            action={<Pill tone="green" pulse>LIVE</Pill>}
          />
          {stats.data ? <WeeklyBars data={stats.data.weeklyXP} /> : <Skeleton className="h-48" />}
        </Card>

        <Card>
          <CardHeader
            title="Your rank"
            subtitle="Global leaderboard snapshot."
          />
          {leaderboard.loading || !leaderboard.data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {leaderboard.data.slice(0, 5).map((e) => (
                <li
                  key={e.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-white/5",
                    e.userId === user?.id
                      ? "bg-gradient-to-r from-neon-purple/15 to-transparent ring-neon-purple/30"
                      : "bg-white/[0.02]",
                  )}
                >
                  <span className="w-6 font-display text-sm text-white/70">#{e.rank}</span>
                  <span className="flex-1 truncate text-sm text-white">{e.name}</span>
                  <span className="font-mono text-xs tabular-nums text-white/60">
                    {e.xp.toLocaleString()}
                  </span>
                </li>
              ))}
              {myRank && myRank.rank > 5 && (
                <li className="mt-1 flex items-center gap-3 rounded-xl bg-gradient-to-r from-neon-purple/15 to-transparent ring-1 ring-neon-purple/30 px-3 py-2">
                  <span className="w-6 font-display text-sm text-white/70">#{myRank.rank}</span>
                  <span className="flex-1 text-sm text-white">You</span>
                  <span className="font-mono text-xs tabular-nums text-white/80">
                    {myRank.xp.toLocaleString()}
                  </span>
                </li>
              )}
            </ul>
          )}
          <Link
            href="/leaderboard"
            className="mt-4 inline-flex items-center gap-1 text-xs text-neon-cyan hover:text-white"
          >
            View full board →
          </Link>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming events"
            subtitle="Your RSVPs and what's on deck."
            action={
              <Link href="/events" className="text-xs text-neon-cyan hover:text-white">
                All events →
              </Link>
            }
          />
          {events.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Nothing on your calendar"
              description="Browse events and grab a seat before the cohort does."
              action={
                <Link href="/events"><Button size="sm">Browse events</Button></Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((e) => (
                <li
                  key={e.id}
                  className="group relative flex items-center gap-4 rounded-xl p-3 ring-1 ring-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple/25 to-neon-cyan/15 ring-1 ring-white/10">
                    <span className="font-display text-[10px] uppercase text-white/70">
                      {new Date(e.startsAt).toLocaleString("en-IN", { month: "short" })}
                    </span>
                    <span className="font-display text-sm text-white leading-none">
                      {new Date(e.startsAt).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm text-white">{e.title}</p>
                      {e.status === "live" && <Pill tone="green" pulse>LIVE</Pill>}
                    </div>
                    <p className="truncate text-xs text-white/55">
                      {formatDate(e.startsAt)} · {e.location}
                    </p>
                  </div>
                  <Pill tone="yellow">+{e.xpReward} XP</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Activity" subtitle="Your recent moves." />
          {activity.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <ul className="relative space-y-3 before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-px before:bg-white/10">
              {(activity.data ?? []).slice(0, 6).map((a) => (
                <li key={a.id} className="relative flex gap-3 pl-7">
                  <span className="absolute left-0 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink-950 ring-1 ring-white/15">
                    {iconFor(a.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{a.title}</p>
                    <p className="text-[11px] text-white/45">{relativeTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <QuickActions />
    </div>
  );
}

function iconFor(type: string) {
  const map: Record<string, React.ReactNode> = {
    event_join: <Calendar className="h-3 w-3 text-neon-cyan" />,
    game_played: <Gamepad2 className="h-3 w-3 text-neon-purple" />,
    badge_earned: <Sparkles className="h-3 w-3 text-neon-yellow" />,
    level_up: <Rocket className="h-3 w-3 text-neon-green" />,
    post: <Flame className="h-3 w-3 text-neon-pink" />,
  };
  return map[type] ?? <Sparkles className="h-3 w-3 text-white/70" />;
}

function WeeklyBars({ data }: { data: { day: string; xp: number }[] }) {
  const max = Math.max(...data.map((d) => d.xp), 1);
  return (
    <div className="mt-2 flex h-48 items-end gap-3 px-1 pt-6">
      {data.map((d, i) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <motion.div
              className="relative w-full rounded-t-lg bg-gradient-to-t from-neon-purple via-neon-cyan to-neon-green"
              style={{ boxShadow: "0 -6px 30px -8px rgba(168,85,247,0.4)" }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.xp / max) * 100}%` }}
              transition={{ delay: i * 0.06, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="absolute inset-x-0 -top-5 text-center text-[10px] font-mono text-white/60 tabular-nums">
                {d.xp}
              </div>
            </motion.div>
          </div>
          <span className="font-mono text-[10px] text-white/50">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  const items = [
    { href: "/games", label: "Play a game", emoji: "🎮", sub: "Jump into the arcade" },
    { href: "/events", label: "Browse events", emoji: "📅", sub: "See what is happening next" },
    { href: "/leaderboard", label: "Check rankings", emoji: "🏆", sub: "Global and game-specific boards" },
    { href: "/profile", label: "Open profile", emoji: "✨", sub: "XP, level, and activity history" },
  ];
  return (
    <section>
      <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-white/50">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group relative overflow-hidden rounded-2xl glass p-4 hover-lift hover:shadow-glow-sm"
          >
            <div className="pointer-events-none absolute -right-4 -bottom-4 text-6xl opacity-30 transition-all group-hover:opacity-60 group-hover:scale-110">
              {a.emoji}
            </div>
            <p className="relative text-sm text-white">{a.label}</p>
            <p className="relative mt-0.5 text-[11px] text-white/50">{a.sub}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
