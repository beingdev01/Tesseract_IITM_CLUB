"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1 rounded-xl glass p-1",
        className,
      )}
    >
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "text-white" : "text-white/55 hover:text-white/80",
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-neon-purple/30 via-neon-cyan/20 to-neon-green/20 ring-1 ring-white/15 shadow-glow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
