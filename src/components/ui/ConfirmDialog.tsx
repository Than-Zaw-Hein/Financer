'use client'

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  message: string
  confirmLabel?: string
}

export default function ConfirmDialog({ open, onCancel, onConfirm, message, confirmLabel = 'Delete' }: ConfirmDialogProps) {
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {}
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]"
      onClick={handleBackdrop}
    >
      <div role="alertdialog" aria-modal="true" className="bg-surface text-on-surface rounded-[28px] shadow-elevation-3 w-full max-w-sm mx-4 p-6 text-center space-y-5">
        <p className="text-body-large font-normal text-on-surface">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-6 py-3 text-label-large text-on-error bg-error rounded-[20px] hover:brightness-90 transition-all">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
