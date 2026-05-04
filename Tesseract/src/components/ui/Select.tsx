"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, hint, error, options, className, id, ...props }, ref) {
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
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full appearance-none rounded-xl glass px-3 py-3 pr-9 text-sm text-white outline-none transition-all",
              "focus:border-neon-purple/50 focus:shadow-glow-sm",
              error && "border-neon-red/60",
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-ink-900">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
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
  },
);
