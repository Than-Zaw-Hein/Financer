interface ProgressBarProps {
  value: number
  label?: string
  sublabel?: string
  color?: 'primary' | 'tertiary' | 'error'
}

export default function ProgressBar({ value, label, sublabel, color = 'primary' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const barColor = color === 'primary' ? 'bg-primary'
    : color === 'tertiary' ? 'bg-tertiary'
    : 'bg-error'

  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="flex justify-between text-label-small text-on-surface-variant mb-1.5">
          {label && <span>{label}</span>}
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
