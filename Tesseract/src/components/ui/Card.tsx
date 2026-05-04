"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  glow?: boolean;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  ring?: boolean;
  children?: React.ReactNode;
}

const pads = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, glow, hover, ring, padding = "md", children, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative glass rounded-2xl overflow-hidden",
        ring && "ring-gradient",
        glow && "shadow-glow-sm",
        hover && "hover-lift hover:shadow-glow-md",
        pads[padding],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="min-w-0">
        <h3 className="font-display text-lg text-white tracking-wide">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
