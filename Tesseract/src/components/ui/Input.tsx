"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightIcon, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "group relative flex items-center rounded-xl glass transition-all duration-200",
          "focus-within:border-neon-purple/50 focus-within:shadow-glow-sm",
          error && "border-neon-red/60",
        )}
      >
        {leftIcon && (
          <span className="pl-3 text-white/50 group-focus-within:text-neon-cyan transition-colors">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none",
            leftIcon && "pl-2",
            rightIcon && "pr-2",
            className,
          )}
          {...props}
        />
        {rightIcon && <span className="pr-3 text-white/50">{rightIcon}</span>}
      </div>
      {(hint || error) && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-neon-red" : "text-white/50",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className, id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-[100px] rounded-xl glass px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all",
            "focus:border-neon-purple/50 focus:shadow-glow-sm",
            error && "border-neon-red/60",
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-neon-red" : "text-white/50",
            )}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
