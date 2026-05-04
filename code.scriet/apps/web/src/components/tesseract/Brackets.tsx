import type { ReactNode } from 'react';

type Accent = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

interface BracketsProps {
  children: ReactNode;
  tag?: string;
  accent?: Accent;
  className?: string;
  style?: React.CSSProperties;
}

const accentClass: Record<Accent, string> = {
  red:    't-red',
  orange: 't-orange',
  yellow: 't-yellow',
  green:  't-green',
  blue:   't-blue',
  purple: 't-purple',
};

export function Brackets({ children, tag, accent = 'yellow', className = '', style }: BracketsProps) {
  return (
    <div
      className={`lb-bracket ${accentClass[accent]} ${className}`}
      style={style}
    >
      {tag && <div className="lb-bracket-tag">{tag}</div>}
      <div className="lb-bracket-corner lb-c-tl" />
      <div className="lb-bracket-corner lb-c-tr" />
      <div className="lb-bracket-corner lb-c-bl" />
      <div className="lb-bracket-corner lb-c-br" />
      {children}
    </div>
  );
}
