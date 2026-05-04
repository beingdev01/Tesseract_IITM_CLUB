import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * The error message. If null/undefined/empty, the component renders nothing.
   * Pass a react-hook-form error.message directly.
   */
  children?: React.ReactNode;
}

/**
 * Standard form-field error renderer.
 *
 * Place directly under the input. Sets `role="alert"` so screen readers announce
 * it on appearance. Uses --error-fg for legibility (lighter red than --error
 * which is reserved for the field border).
 *
 * Usage:
 *   <Input aria-invalid={!!errors.name} {...register('name')} />
 *   <FormError>{errors.name?.message}</FormError>
 */
export function FormError({ children, className, ...props }: FormErrorProps) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        'mt-1.5 inline-flex items-start gap-1.5 text-xs font-mono text-error-fg leading-snug',
        className,
      )}
      {...props}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Field-level helper text, sits below the input with muted styling.
 */
export function FormHelp({ children, className, ...props }: FormErrorProps) {
  if (!children) return null;
  return (
    <p
      className={cn('mt-1.5 text-xs font-mono text-fg-mute leading-snug', className)}
      {...props}
    >
      {children}
    </p>
  );
}
