export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-[12px] p-6 animate-pulse space-y-4">
      <div className="h-4 w-1/3 bg-on-surface/10 rounded-full" />
      <div className="h-8 w-2/3 bg-on-surface/10 rounded-full" />
      <div className="h-3 w-1/2 bg-on-surface/10 rounded-full" />
    </div>
  )
}

export function RowSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-14 bg-on-surface/5 rounded-[12px]" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-surface rounded-[12px] p-4 animate-pulse space-y-3">
      <div className="flex gap-4 pb-2 border-b border-outline-variant">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 w-20 bg-on-surface/10 rounded-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 w-20 bg-on-surface/5 rounded-full" />
          ))}
        </div>
      ))}
    </div>
  )
}
