"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn, formatNumber } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  delta?: string;
  tone?: "purple" | "cyan" | "green" | "yellow" | "pink" | "red";
  animate?: boolean;
  className?: string;
}

const toneGrad: Record<NonNullable<StatCardProps["tone"]>, string> = {
  purple: "from-neon-purple/40",
  cyan: "from-neon-cyan/40",
  green: "from-neon-green/40",
  yellow: "from-neon-yellow/40",
  pink: "from-neon-pink/40",
  red: "from-neon-red/40",
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  tone = "purple",
  animate = true,
  className,
}: StatCardProps) {
  const numeric = typeof value === "number" ? value : null;
  const counted = useCountUp(numeric ?? 0);
  const display = numeric === null ? value : animate ? formatNumber(counted) : formatNumber(numeric);

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl glass p-5 hover-lift",
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          toneGrad[tone],
        )}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
          <p className="mt-2 font-display text-3xl text-white tabular-nums">{display}</p>
          {delta && <p className="mt-1 text-xs text-white/50">{delta}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 text-white">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
