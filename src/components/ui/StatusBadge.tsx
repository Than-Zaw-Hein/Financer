interface StatusBadgeProps {
  status: string
}

const colors: Record<string, string> = {
  paid: 'bg-tertiary-container text-on-tertiary-container',
  unpaid: 'bg-error-container text-on-error-container',
  partial: 'bg-[#fff3e0] text-[#e65100]',
  active: 'bg-secondary-container text-on-secondary-container',
  paid_loan: 'bg-tertiary-container text-on-tertiary-container',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const key = status === 'paid' && status === 'paid' ? status : status
  const cls = colors[status] || 'bg-surface-container text-on-surface-variant'
  return (
    <span className={`inline-block px-3 py-1 rounded-[8px] text-label-small font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
