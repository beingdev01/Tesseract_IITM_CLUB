"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Logo({
  size = 32,
  showWord = true,
  className,
}: {
  size?: number;
  showWord?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        whileHover={{ rotate: 90 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
      >
        <svg
          viewBox="0 0 40 40"
          width={size}
          height={size}
          className="drop-shadow-[0_0_10px_rgba(168,85,247,0.45)]"
        >
          <defs>
            <linearGradient id="tess-g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF3860" />
              <stop offset="25%" stopColor="#FFD93D" />
              <stop offset="55%" stopColor="#38F9A0" />
              <stop offset="80%" stopColor="#30E8FF" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <rect
            x="5"
            y="5"
            width="30"
            height="30"
            rx="5"
            fill="none"
            stroke="url(#tess-g)"
            strokeWidth="2"
          />
          <rect
            x="11"
            y="11"
            width="18"
            height="18"
            rx="3"
            fill="none"
            stroke="url(#tess-g)"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <line x1="5" y1="5" x2="11" y2="11" stroke="url(#tess-g)" strokeWidth="1.2" />
          <line x1="35" y1="5" x2="29" y2="11" stroke="url(#tess-g)" strokeWidth="1.2" />
          <line x1="5" y1="35" x2="11" y2="29" stroke="url(#tess-g)" strokeWidth="1.2" />
          <line x1="35" y1="35" x2="29" y2="29" stroke="url(#tess-g)" strokeWidth="1.2" />
        </svg>
      </motion.div>
      {showWord && (
        <span className="font-display text-lg tracking-[0.25em] text-gradient-static">
          TESSERACT
        </span>
      )}
    </div>
  );
}
