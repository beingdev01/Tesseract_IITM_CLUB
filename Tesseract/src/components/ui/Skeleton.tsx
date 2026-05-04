import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  rounded = "lg",
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
        ? "rounded-2xl"
        : rounded === "lg"
          ? "rounded-xl"
          : rounded === "md"
            ? "rounded-lg"
            : "rounded";
  return <div className={cn("skeleton", r, className)} />;
}
