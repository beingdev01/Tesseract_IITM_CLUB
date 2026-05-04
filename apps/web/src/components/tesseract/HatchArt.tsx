import type { Accent } from './MetaChip';

const accentClass: Record<Accent, string> = {
  red: 't-red',
  orange: 't-orange',
  yellow: 't-yellow',
  green: 't-green',
  blue: 't-blue',
  purple: 't-purple',
};

interface HatchArtProps {
  glyph?: string;
  tag?: string;
  accent?: Accent;
  className?: string;
  height?: number | string;
}

export function HatchArt({ glyph, tag, accent = 'yellow', className = '', height = 160 }: HatchArtProps) {
  return (
    <div
      className={`lb-hatch ${accentClass[accent]} ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {glyph ? <div className="lb-hatch-glyph">{glyph}</div> : null}
      {tag ? <div className="lb-hatch-tag">{tag}</div> : null}
    </div>
  );
}
