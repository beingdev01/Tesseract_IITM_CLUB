"use client";

import { motion } from "framer-motion";

export function BackgroundAura() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950"
    >
      <div className="absolute inset-0 bg-grid-faint bg-grid-48 opacity-[0.12]" />
      <div className="absolute inset-0 bg-aurora" />

      <motion.div
        className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-neon-purple/20 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[38rem] w-[38rem] rounded-full bg-neon-cyan/15 blur-3xl"
        animate={{ x: [0, -40, 20, 0], y: [0, -30, 10, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/3 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-green/10 blur-3xl"
        animate={{ x: [0, 20, -15, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/80" />
    </div>
  );
}
