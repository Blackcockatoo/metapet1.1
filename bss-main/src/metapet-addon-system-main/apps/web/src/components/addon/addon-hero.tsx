import { Surface } from "@bluesnake-studios/ui";

export function AddonHero({ title, description }: { title: string; description: string }) {
  return (
    <Surface className="hero-card" tone="accent">
      <p className="eyebrow">Addon Template</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </Surface>
  );
}
