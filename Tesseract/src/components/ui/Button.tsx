"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-green bg-[length:200%_auto] hover:bg-[position:100%_50%] shadow-glow-md transition-[background-position,box-shadow] duration-500",
  secondary:
    "text-white glass-strong hover:bg-white/10 hover:border-white/20",
  ghost:
    "text-white/80 hover:text-white hover:bg-white/5",
  outline:
    "text-white border border-white/15 hover:border-white/30 hover:bg-white/5",
  danger:
    "text-white bg-gradient-to-r from-neon-red to-neon-orange hover:shadow-[0_0_30px_-5px_rgba(255,56,96,0.6)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-2xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading,
      leftIcon,
      rightIcon,
      fullWidth,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium tracking-wide overflow-hidden",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          </span>
        )}
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  },
);
