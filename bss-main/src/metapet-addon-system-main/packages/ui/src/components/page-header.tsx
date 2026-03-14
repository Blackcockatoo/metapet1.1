import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      {eyebrow ? <p className="ui-page-header__eyebrow">{eyebrow}</p> : null}
      <div className="ui-page-header__body">
        <div>
          <h1 className="ui-page-header__title">{title}</h1>
          <p className="ui-page-header__description">{description}</p>
        </div>
        {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
