export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-10 max-w-4xl space-y-8">
      <div>
        <div className="skeleton h-7 w-56 mb-2" />
        <div className="skeleton h-4 w-40" />
      </div>
      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-20 w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
    </div>
  )
}
