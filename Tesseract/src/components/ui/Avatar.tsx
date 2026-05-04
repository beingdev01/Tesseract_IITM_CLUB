"use client";

import { cn, initialsOf, seededColor } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  className?: string;
  ring?: boolean;
  status?: "online" | "offline" | "playing";
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
  ring,
  status,
}: AvatarProps) {
  const color = seededColor(name);
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-display text-white",
        ring && "ring-2 ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: src
          ? undefined
          : `linear-gradient(135deg, ${color}, #0A0B12)`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="select-none"
          style={{ fontSize: Math.max(10, size * 0.38) }}
        >
          {initialsOf(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-ink-950",
            status === "online" && "bg-neon-green",
            status === "offline" && "bg-white/30",
            status === "playing" && "bg-neon-purple animate-pulse",
          )}
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      )}
    </div>
  );
}
