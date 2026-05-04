import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          // Tesseract field label — uppercase mono kicker. See DESIGN_SYSTEM.md §6.
          'inline-block text-[11px] tracking-[0.14em] uppercase font-mono text-fg-dim',
          'leading-none',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
        {required && <span className="text-tesseract-yellow ml-1" aria-hidden="true">*</span>}
      </label>
    );
  },
);
Label.displayName = 'Label';

export { Label };
