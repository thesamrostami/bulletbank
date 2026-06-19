export default function ProfileLoading() {
  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <div className="skeleton h-7 w-40 mb-2" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex justify-between mb-3">
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-48" />
            </div>
            <div className="skeleton h-7 w-12 rounded-lg" />
          </div>
          <div className="skeleton h-3 w-full" />
        </div>
      ))}
    </div>
  )
}
