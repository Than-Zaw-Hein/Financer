interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export default function Chip({ label, selected, onClick, className = '' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-[8px] text-label-large font-medium transition-all
        ${selected
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-transparent text-on-surface-variant border border-outline hover:bg-on-surface/8'
        } ${className}`}
    >
      {selected && <span className="mr-1.5">✓</span>}
      {label}
    </button>
  )
}
