import type { ReactNode } from 'react';

export type Accent = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

const accentClass: Record<Accent, string> = {
  red: 't-red',
  orange: 't-orange',
  yellow: 't-yellow',
  green: 't-green',
  blue: 't-blue',
  purple: 't-purple',
};

interface MetaChipProps {
  label: string;
  value: ReactNode;
  accent?: Accent;
  className?: string;
}

export function MetaChip({ label, value, accent = 'yellow', className = '' }: MetaChipProps) {
  return (
    <div className={`lb-meta-item ${accentClass[accent]} ${className}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
