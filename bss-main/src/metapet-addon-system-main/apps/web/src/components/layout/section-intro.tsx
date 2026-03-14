export function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="section-intro">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
