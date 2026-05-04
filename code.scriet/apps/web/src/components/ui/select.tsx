import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Native <select> primitive styled to match Input/Textarea.
 *
 * Use when you need a real OS dropdown with simple <option> children.
 * For typeahead/multi-select/search, build on top of @radix-ui/react-select.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          // Base — matches Input. See DESIGN_SYSTEM.md §6.
          'flex h-10 w-full appearance-none bg-surface-3 px-3.5 pr-10 py-2 text-sm text-fg font-mono cursor-pointer',
          'border border-edge-default',
          'transition-colors duration-150',
          'hover:border-edge-strong',
          'focus:outline-none focus:border-tesseract-yellow focus:ring-2 focus:ring-tesseract-yellow/30',
          'disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-surface-2',
          'aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-bg',
          // Caret SVG painted in Tesseract yellow
          "bg-no-repeat bg-[right_14px_center]",
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23ffd93b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';

export { Select };
