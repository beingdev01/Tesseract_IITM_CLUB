"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { eventsApi } from "@/lib/api/services";
import { formatDate } from "@/lib/utils";

const TONE: Record<string, "purple" | "cyan" | "yellow" | "green" | "pink" | "blue"> = {
  hackathon: "purple",
  quiz: "cyan",
  meetup: "green",
  workshop: "yellow",
  tournament: "pink",
  social: "blue",
};

export function EventsPreview() {
  const { data, loading } = useApi(
    () => eventsApi.list({ pageSize: 3 }),
    [],
  );
  const events = (data ?? []).filter((event) => event.status !== "completed").slice(0, 3);

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-green">
            / events on deck
          </p>
          <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
            Show up. Gain XP.
          </h2>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          See all events <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-2xl" />
          ))
        ) : events.length > 0 ? (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <Card hover className="group h-full">
                <div className="flex items-center justify-between">
                  <Pill tone={TONE[event.category] ?? "purple"}>{event.category}</Pill>
                  {event.status === "live" ? (
                    <Pill tone="green" pulse>LIVE</Pill>
                  ) : (
                    <Pill tone="default">{formatDate(event.startsAt, { month: "short", day: "numeric" })}</Pill>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg text-white group-hover:text-gradient-static transition-colors">
                  {event.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-white/60">{event.description}</p>
                <div className="mt-5 space-y-1.5 text-xs text-white/55">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.startsAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {event.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" /> {event.registered}/{event.capacity} registered
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="lg:col-span-3">
            <p className="text-sm text-white/60">
              Events will appear here once the first schedule is published.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
