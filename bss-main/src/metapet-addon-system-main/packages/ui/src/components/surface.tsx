import type { HTMLAttributes, ReactNode } from "react";

type SurfaceTone = "accent" | "default" | "muted";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  children: ReactNode;
  tone?: SurfaceTone;
}

export function Surface({ as = "section", children, className, tone = "default", ...props }: SurfaceProps) {
  const Component = as;
  const toneClass = `ui-surface ui-surface--${tone}`;
  const composedClassName = className ? `${toneClass} ${className}` : toneClass;

  return (
    <Component className={composedClassName} {...props}>
      {children}
    </Component>
  );
}
