export function SkeletonLine({ width = 'full', height = '4' }: { width?: string; height?: string }) {
  return (
    <div className={`w-${width} h-${height} bg-gray-100 rounded animate-pulse`} />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 rounded animate-pulse"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  )
}

export function BulletGroupSkeleton() {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="p-3 bg-gray-50 flex items-center gap-3">
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-2" />
      </div>
      <div className="divide-y divide-gray-50">
        {[0, 1, 2].map(i => (
          <div key={i} className="px-4 py-3 flex items-start gap-3">
            <div className="w-4 h-4 rounded bg-gray-100 animate-pulse mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 - i * 5}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CVPreviewSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-4/6 bg-gray-100 rounded animate-pulse" />
      </div>
      {[0, 1].map(i => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
