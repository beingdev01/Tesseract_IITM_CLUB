import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function relativeTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const sec = 1000,
    min = 60 * sec,
    hr = 60 * min,
    day = 24 * hr;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < min) return rtf.format(Math.round(diff / sec), "second");
  if (abs < hr) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hr), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diff / day), "day");
  return formatDate(d);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function seededColor(seed: string): string {
  const colors = [
    "#FF3860",
    "#FF8A3D",
    "#FFD93D",
    "#38F9A0",
    "#30E8FF",
    "#4D8BFF",
    "#A855F7",
    "#F472B6",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export type AccentColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

const ACCENT_COLORS: AccentColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
];

export function accentAt(index: number): AccentColor {
  return ACCENT_COLORS[index % ACCENT_COLORS.length] ?? "yellow";
}

export function accentFromSeed(seed: string): AccentColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length] ?? "yellow";
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
