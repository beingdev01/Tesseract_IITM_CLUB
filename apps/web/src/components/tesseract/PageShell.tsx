import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`lb-root ${className}`}>
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />
      {children}
    </div>
  );
}
