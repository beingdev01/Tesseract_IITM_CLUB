import type { ReactNode } from 'react';
import type { Accent } from './MetaChip';

const accentClass: Record<Accent, string> = {
  red: 't-red',
  orange: 't-orange',
  yellow: 't-yellow',
  green: 't-green',
  blue: 't-blue',
  purple: 't-purple',
};

interface RowAccentProps {
  time?: ReactNode;
  tag?: ReactNode;
  accent?: Accent;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function RowAccent({ time, tag, accent = 'yellow', children, trailing, className = '', onClick }: RowAccentProps) {
  return (
    <div
      className={`lb-row ${accentClass[accent]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {time ? <span className="lb-row-time">{time}</span> : null}
      {tag ? <span className="lb-row-tag">{tag}</span> : null}
      <span className="lb-row-body">{children}</span>
      {trailing ? <span className="flex-shrink-0">{trailing}</span> : null}
    </div>
  );
}

const ACCENTS: Accent[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
export function rotateAccent(index: number): Accent {
  return ACCENTS[index % ACCENTS.length];
}
