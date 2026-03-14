import type { ReactNode } from "react";

export interface InfoGridItem {
  label: string;
  value: ReactNode;
}

export interface InfoGridProps {
  items: InfoGridItem[];
}

export function InfoGrid({ items }: InfoGridProps) {
  return (
    <dl className="ui-info-grid">
      {items.map((item) => (
        <div className="ui-info-grid__item" key={item.label}>
          <dt className="ui-info-grid__label">{item.label}</dt>
          <dd className="ui-info-grid__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
