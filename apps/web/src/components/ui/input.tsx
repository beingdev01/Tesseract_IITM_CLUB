import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // Base — token-driven, dark theme. See DESIGN_SYSTEM.md §6.
          'flex h-10 w-full bg-surface-3 px-3.5 py-2 text-sm text-fg font-mono',
          'border border-edge-default placeholder:text-fg-faint',
          'transition-colors duration-150',
          // Hover
          'hover:border-edge-strong',
          // Focus — yellow border + visible outer ring
          'focus:outline-none focus:border-tesseract-yellow focus:ring-2 focus:ring-tesseract-yellow/30 focus:ring-offset-0',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-surface-2',
          // Error — set aria-invalid="true"
          'aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-bg',
          'aria-[invalid=true]:focus:ring-error/30',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
