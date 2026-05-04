import { ReactNode } from "react";

type BracketsProps = {
  children: ReactNode;
  tag?: string;
  accent?: "red" | "orange" | "yellow" | "green" | "blue" | "purple";
  className?: string;
};

export function Brackets({ children, tag, accent, className = "" }: BracketsProps) {
  const accentClass = accent ? `lb-c-${accent}` : "";
  return (
    <div className={`lb-bracket ${accentClass} ${className}`.trim()}>
      {tag && <div className="lb-bracket-tag">{tag}</div>}
      <div className="lb-bracket-corner lb-c-tl" />
      <div className="lb-bracket-corner lb-c-tr" />
      <div className="lb-bracket-corner lb-c-bl" />
      <div className="lb-bracket-corner lb-c-br" />
      {children}
    </div>
  );
}
