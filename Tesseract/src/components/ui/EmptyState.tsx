"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center py-14 px-6 glass rounded-2xl overflow-hidden",
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-aurora opacity-40"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {icon && (
        <motion.div
          className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon}
        </motion.div>
      )}
      <h3 className="relative font-display text-lg text-white">{title}</h3>
      {description && (
        <p className="relative mt-2 max-w-sm text-sm text-white/60">
          {description}
        </p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
