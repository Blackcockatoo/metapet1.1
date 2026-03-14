export interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <h2 className="ui-empty-state__title">{title}</h2>
      <p className="ui-empty-state__message">{message}</p>
    </div>
  );
}
