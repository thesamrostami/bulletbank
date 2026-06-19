export default function JobsLoading() {
  return (
    <div className="p-6 md:p-10 max-w-5xl space-y-6">
      <div className="skeleton h-7 w-32 mb-2" />
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-6 w-20 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
