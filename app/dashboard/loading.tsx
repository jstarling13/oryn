export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav skeleton */}
      <div className="bg-white border-b border-gray-100 h-14" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-28" />
            </div>
          ))}
        </div>

        {/* Vendor cards skeleton */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
              <div className="h-1 bg-gray-200" />
              <div className="p-5">
                <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
                <div className="h-24 bg-gray-100 rounded-xl mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
