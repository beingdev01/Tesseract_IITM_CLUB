"use client";

import { motion } from "framer-motion";
import { Calendar, Gamepad2, Trophy, Users, Zap, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: Calendar,
    title: "Events that matter",
    body: "Hackathons, quiz clashes, campus meetups. RSVP in one tap, get XP for showing up.",
    tone: "from-neon-purple/40",
  },
  {
    icon: Gamepad2,
    title: "Games, not homework",
    body: "Bite-sized competitive games built for the 2 AM study break, not the 9 AM class.",
    tone: "from-neon-cyan/40",
  },
  {
    icon: Trophy,
    title: "Leaderboards, real-time",
    body: "Global + per-game. Watch ranks shift live and see exactly where you stand.",
    tone: "from-neon-yellow/40",
  },
  {
    icon: Users,
    title: "A cohort, not a chatroom",
    body: "Your year, your state, your track — find your people without another Discord server.",
    tone: "from-neon-green/40",
  },
  {
    icon: Zap,
    title: "Gamified everything",
    body: "XP, streaks, badges, levels. Every action has a signal. Every signal compounds.",
    tone: "from-neon-pink/40",
  },
  {
    icon: Shield,
    title: "Closed & verified",
    body: "Only IITM BS emails. No bots, no randoms. Just your cohort, shipping together.",
    tone: "from-neon-blue/40",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
          / the platform
        </p>
        <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
          Built for how IITM BS
          <br />
          <span className="text-gradient-static">actually lives online.</span>
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Card hover className="group h-full">
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${f.tone} to-transparent blur-2xl opacity-60 transition-opacity group-hover:opacity-90`}
                />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 font-display text-lg text-white">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                    {f.body}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
