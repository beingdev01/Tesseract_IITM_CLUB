"use client";

import { motion } from "framer-motion";
import { cn, clamp } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  label,
  showValue,
  tone = "gradient",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "gradient" | "green" | "purple" | "cyan";
  className?: string;
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const bar =
    tone === "gradient"
      ? "bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-green"
      : tone === "green"
        ? "bg-neon-green"
        : tone === "purple"
          ? "bg-neon-purple"
          : "bg-neon-cyan";
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
          <span>{label}</span>
          {showValue && <span className="tabular-nums text-white/80">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
        <motion.div
          className={cn("h-full rounded-full", bar)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        >
          <span className="absolute inset-y-0 right-0 w-6 bg-white/30 blur-md" />
        </motion.div>
      </div>
    </div>
  );
}
