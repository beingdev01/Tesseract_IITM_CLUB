import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        // Tesseract primary — yellow chamfered button
        default: 'lb-btn-primary',
        // Tesseract ghost — transparent, white border
        ghost: 'lb-btn-ghost',
        // Destructive — red tint
        destructive:
          'bg-[#ff3b3b] text-white hover:bg-[#ff6b6b] active:translate-x-px active:translate-y-px',
        // Outline — subtle border, no fill
        outline:
          'border border-white/20 bg-transparent text-white hover:border-[var(--c-yellow)] hover:text-[var(--c-yellow)]',
        // Secondary — dim bg
        secondary:
          'bg-white/5 text-white hover:bg-white/10',
        link: 'text-[var(--c-yellow)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'px-4 py-2 text-xs',
        lg: 'lb-btn-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const buttonClassName = cn(buttonVariants({ variant, size, className }));

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        ...props,
        className: cn(buttonClassName, child.props.className),
      });
    }

    return (
      <button
        className={buttonClassName}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
