interface ErrorStateProps {
  message?: string
  onRetry: () => void
}

export default function ErrorState({ message = 'Failed to load data', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4" aria-hidden="true">⚠️</span>
      <h3 className="text-title-medium text-on-surface mb-1">Something went wrong</h3>
      <p className="text-body-medium text-error mb-6">{message}</p>
      <button onClick={onRetry} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all">
        Retry
      </button>
    </div>
  )
}
