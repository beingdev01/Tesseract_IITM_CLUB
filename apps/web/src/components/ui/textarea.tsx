import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          // Base — token-driven. See DESIGN_SYSTEM.md §6.
          'flex min-h-[96px] w-full bg-surface-3 px-3.5 py-2.5 text-sm text-fg font-mono leading-relaxed',
          'border border-edge-default placeholder:text-fg-faint',
          'transition-colors duration-150 resize-y',
          // Hover
          'hover:border-edge-strong',
          // Focus
          'focus:outline-none focus:border-tesseract-yellow focus:ring-2 focus:ring-tesseract-yellow/30 focus:ring-offset-0',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-surface-2 disabled:resize-none',
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
Textarea.displayName = 'Textarea';

export { Textarea };
