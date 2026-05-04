"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl glass-strong ring-gradient p-10 text-center shadow-glow-lg"
      >
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid-48 opacity-10" />
        <div className="relative">
          <h3 className="font-display text-3xl text-white sm:text-4xl">
            You're already in the cohort.
            <br />
            <span className="text-gradient">Just activate the signal.</span>
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Your IITM BS email is your pass. No forms, no invites, no gatekeepers.
            Join in 30 seconds and meet your people.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Activate my account
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button size="lg" variant="secondary">
                Peek at the leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
