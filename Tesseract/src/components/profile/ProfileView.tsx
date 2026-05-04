"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Flame,
  Gamepad2,
  Rocket,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { activityApi, dashboardApi } from "@/lib/api/services";
import { cn, formatDate, formatNumber, relativeTime } from "@/lib/utils";
import type { Badge } from "@/lib/types";

const RARITY: Record<Badge["rarity"], { tone: "purple" | "cyan" | "yellow" | "green"; glow: string }> = {
  common: { tone: "green", glow: "shadow-[0_0_20px_-5px_rgba(56,249,160,0.45)]" },
  rare: { tone: "cyan", glow: "shadow-[0_0_22px_-5px_rgba(48,232,255,0.5)]" },
  epic: { tone: "purple", glow: "shadow-[0_0_26px_-5px_rgba(168,85,247,0.55)]" },
  legendary: { tone: "yellow", glow: "shadow-[0_0_30px_-5px_rgba(255,217,61,0.65)]" },
};

export function ProfileView() {
  const user = useAuthStore((s) => s.user);
  const activity = useApi(() => activityApi.feed(user?.id), [user?.id]);
  const stats = useApi(() => dashboardApi.stats(), []);

  if (!user) return <Skeleton className="h-60" />;

  const levelProgress = ((user.xp % 5000) / 5000) * 100;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden" padding="none">
        <div className="relative h-40 bg-gradient-to-r from-neon-purple/50 via-neon-cyan/40 to-neon-green/40">
          <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-20" />
          <div className="absolute inset-0 bg-aurora opacity-60" />
        </div>
        <div className="relative flex flex-wrap items-end gap-5 px-6 pb-6 -mt-12">
          <Avatar name={user.name} src={user.avatar} size={110} ring className="ring-4 ring-ink-950" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl text-white">{user.name}</h1>
            <p className="text-sm text-white/55">
              {user.email} · {user.rollNumber ?? "IITM BS"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill tone="purple" className="uppercase">{user.role}</Pill>
              <Pill tone="yellow">{user.level ?? "Bronze"}</Pill>
              <Pill tone="green"><Flame className="h-3 w-3" /> {user.streak ?? 0}-day streak</Pill>
              <Pill tone="cyan">joined {formatDate(user.joinedAt)}</Pill>
            </div>
            {user.bio && (
              <p className="mt-4 max-w-xl text-sm text-white/70">{user.bio}</p>
            )}
          </div>
          <div className="w-full sm:w-80">
            <div className="flex items-center justify-between text-xs text-white/55">
              <span>{user.level ?? "Bronze"}</span>
              <span className="tabular-nums">{formatNumber(user.xp)} XP</span>
            </div>
            <Progress value={levelProgress} className="mt-2" />
            <p className="mt-1.5 text-[11px] text-white/45">
              {Math.round(5000 - (user.xp % 5000))} XP to next tier
            </p>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="XP" value={user.xp} icon={<Sparkles className="h-5 w-5 text-neon-yellow" />} tone="yellow" />
        <StatCard label="Rank" value={user.rank ? `#${user.rank}` : "Unranked"} icon={<Trophy className="h-5 w-5 text-neon-pink" />} tone="pink" />
        <StatCard
          label="Events"
          value={stats.data?.eventsJoined ?? 0}
          icon={<Calendar className="h-5 w-5 text-neon-cyan" />}
          tone="cyan"
        />
        <StatCard
          label="Games"
          value={stats.data?.gamesPlayed ?? 0}
          icon={<Gamepad2 className="h-5 w-5 text-neon-purple" />}
          tone="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Activity timeline"
            subtitle="Every event joined, every game played, every badge earned."
          />
          {activity.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <ul className="relative space-y-4 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
              {(activity.data ?? []).map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex gap-4 pl-10"
                >
                  <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 ring-1 ring-white/15">
                    <ActIcon type={a.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">{a.title}</p>
                    <p className="text-xs text-white/45">{relativeTime(a.at)}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Badges"
            subtitle="Unlocked achievements."
            action={
              <Pill tone="default">{user.badges?.length ?? 0} / 24</Pill>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            {(user.badges ?? []).map((b) => {
              const r = RARITY[b.rarity];
              return (
                <motion.div
                  key={b.id}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "group relative flex aspect-square flex-col items-center justify-center rounded-2xl glass text-center cursor-default",
                    r.glow,
                  )}
                >
                  <div className="text-3xl">{b.icon}</div>
                  <p className="mt-1 text-[10px] font-display uppercase tracking-wider text-white/80">
                    {b.name}
                  </p>
                  <Pill tone={r.tone} className="absolute -top-2 -right-2 scale-75">
                    {b.rarity}
                  </Pill>
                </motion.div>
              );
            })}
            {Array.from({ length: Math.max(0, 6 - (user.badges?.length ?? 0)) }).map((_, i) => (
              <div
                key={`e${i}`}
                className="aspect-square rounded-2xl border border-dashed border-white/10 opacity-50"
              />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function ActIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    event_join: <Calendar className="h-3.5 w-3.5 text-neon-cyan" />,
    game_played: <Gamepad2 className="h-3.5 w-3.5 text-neon-purple" />,
    badge_earned: <Sparkles className="h-3.5 w-3.5 text-neon-yellow" />,
    level_up: <Rocket className="h-3.5 w-3.5 text-neon-green" />,
    post: <Flame className="h-3.5 w-3.5 text-neon-pink" />,
  };
  return <>{map[type] ?? <Sparkles className="h-3.5 w-3.5 text-white/70" />}</>;
}
