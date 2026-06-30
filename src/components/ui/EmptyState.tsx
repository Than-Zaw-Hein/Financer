interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: string
  onAction?: () => void
}

export default function EmptyState({ icon = '📭', title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4" aria-hidden="true">{icon}</span>
      <h3 className="text-title-medium text-on-surface mb-1">{title}</h3>
      {description && <p className="text-body-medium text-on-surface-variant mb-6">{description}</p>}
      {action && onAction && (
        <button onClick={onAction} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all">
          {action}
        </button>
      )}
    </div>
  )
}
