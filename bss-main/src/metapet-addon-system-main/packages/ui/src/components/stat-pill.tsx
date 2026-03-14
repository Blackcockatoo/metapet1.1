export interface StatPillProps {
  label: string;
  tone?: "accent" | "neutral";
}

export function StatPill({ label, tone = "neutral" }: StatPillProps) {
  return <span className={`ui-stat-pill ui-stat-pill--${tone}`}>{label}</span>;
}
