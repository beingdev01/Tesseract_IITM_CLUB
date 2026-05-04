import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Accent } from './MetaChip';

const accentClass: Record<Accent, string> = {
  red: 't-red',
  orange: 't-orange',
  yellow: 't-yellow',
  green: 't-green',
  blue: 't-blue',
  purple: 't-purple',
};

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  accent?: Accent;
  children: ReactNode;
}

export function Pill({ active = false, accent = 'yellow', children, className = '', ...rest }: PillProps) {
  return (
    <button
      type="button"
      className={`lb-pill ${accentClass[accent]} ${active ? 'active' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
