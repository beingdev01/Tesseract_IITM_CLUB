import type { ReactNode } from 'react';

interface KickerHeadingProps {
  kicker: string;
  title: ReactNode;
  accent?: ReactNode;
  sub?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function KickerHeading({ kicker, title, accent, sub, size = 'md', className = '' }: KickerHeadingProps) {
  const titleSize = size === 'lg' ? 'text-[clamp(40px,6vw,72px)]' : size === 'sm' ? 'text-[clamp(24px,3vw,32px)]' : 'text-[clamp(32px,4.5vw,52px)]';
  return (
    <div className={className}>
      <div className="lb-kicker">{kicker}</div>
      <h1 className={`font-display uppercase leading-[1.05] tracking-[0.02em] mt-2 mb-0 ${titleSize}`}>
        {title}
        {accent ? <> <span className="lb-h-accent">{accent}</span></> : null}
      </h1>
      {sub ? <p className="lb-sub mt-4">{sub}</p> : null}
    </div>
  );
}
