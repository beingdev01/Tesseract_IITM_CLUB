"use client";

import { cn } from "@/lib/utils";

type Tone =
  | "default"
  | "purple"
  | "cyan"
  | "green"
  | "yellow"
  | "red"
  | "pink"
  | "blue";

const tones: Record<Tone, string> = {
  default: "bg-white/10 text-white/80 border-white/10",
  purple: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  cyan: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30",
  green: "bg-neon-green/15 text-neon-green border-neon-green/30",
  yellow: "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30",
  red: "bg-neon-red/15 text-neon-red border-neon-red/30",
  pink: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  blue: "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
};

export function Pill({
  tone = "default",
  children,
  className,
  icon,
  pulse,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
