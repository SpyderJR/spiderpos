interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return (
    <span
      role="presentation"
      className={`bg-carbon-100 dark:bg-carbon-800 relative block overflow-hidden rounded-lg ${className}`}
    >
      <span className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
    </span>
  )
}

export function SkeletonCard() {
  return (
    <div className="border-carbon-100 dark:border-carbon-800 dark:bg-carbon-900 flex flex-col gap-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
