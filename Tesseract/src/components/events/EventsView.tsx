"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { EventModal } from "./EventModal";
import { useApi, useAsyncAction } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api/services";
import { useRole } from "@/hooks/useRole";
import type { TesseractEvent } from "@/lib/types";
import { formatDate, formatTime, cn } from "@/lib/utils";

const TONE: Record<
  string,
  "purple" | "cyan" | "yellow" | "green" | "pink" | "blue"
> = {
  hackathon: "purple",
  quiz: "cyan",
  meetup: "green",
  workshop: "yellow",
  tournament: "pink",
  social: "blue",
};

export function EventsView() {
  const { data, loading, refetch } = useApi(() => eventsApi.list(), []);
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "completed">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TesseractEvent | null>(null);
  const { isCore } = useRole();
  const join = useAsyncAction(eventsApi.join);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        query.trim().length === 0
          ? true
          : [e.title, e.description, ...e.tags, e.location]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
      );
  }, [data, filter, query]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      upcoming: list.filter((e) => e.status === "upcoming").length,
      live: list.filter((e) => e.status === "live").length,
      completed: list.filter((e) => e.status === "completed").length,
    };
  }, [data]);

  const onJoin = async (e: TesseractEvent) => {
    try {
      await join.run(e.id);
      toast.success(`You're in for ${e.title}.`);
      refetch();
    } catch {
      toast.error("Could not join. Try again.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-green">
            / events
          </p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            What the cohort is doing this month.
          </h1>
        </div>
        {isCore && (
          <Button
            variant="secondary"
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => toast("Use Admin → Events to create", { icon: "🛠️" })}
          >
            Manage
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={(id) => setFilter(id as typeof filter)}
          items={[
            { id: "all", label: "All", count: counts.all, icon: <Filter className="h-3.5 w-3.5" /> },
            { id: "live", label: "Live", count: counts.live },
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
            { id: "completed", label: "Past", count: counts.completed },
          ]}
        />
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search events, tags, locations…"
            leftIcon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No events match your filters"
          description="Try widening the net — the cohort is busy."
          action={
            <Button variant="secondary" onClick={() => { setFilter("all"); setQuery(""); }}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.25) }}
            >
              <Card
                hover
                className="group h-full cursor-pointer"
                onClick={() => setSelected(e)}
              >
                <div className="flex items-center justify-between">
                  <Pill tone={TONE[e.category] ?? "purple"}>{e.category}</Pill>
                  {e.status === "live" ? (
                    <Pill tone="green" pulse>LIVE</Pill>
                  ) : e.status === "upcoming" ? (
                    <Pill tone="default">upcoming</Pill>
                  ) : (
                    <Pill tone="default" className="opacity-70">past</Pill>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg text-white group-hover:text-gradient-static transition-colors">
                  {e.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-white/60">
                  {e.description}
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-white/55">
                  <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />}>
                    {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
                  </InfoRow>
                  <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}>{e.location}</InfoRow>
                  <InfoRow icon={<Users className="h-3.5 w-3.5" />}>
                    {e.registered}/{e.capacity} registered
                  </InfoRow>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-green",
                    )}
                    style={{
                      width: `${Math.min(100, (e.registered / e.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Pill tone="yellow">+{e.xpReward} XP</Pill>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelected(e);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <EventModal
        event={selected}
        onClose={() => setSelected(null)}
        onJoin={onJoin}
        joining={join.loading}
      />
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="truncate">{children}</span>
    </div>
  );
}
