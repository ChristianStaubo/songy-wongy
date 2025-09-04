export function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Song Creation Section Skeleton */}
      <div className="lg:col-span-2 space-y-8">
        {/* Song Creation Form Skeleton */}
        <div className="bg-white rounded-lg border p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>

              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
              </div>

              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-28 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Song Library Skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg border p-4">
                <div className="space-y-3">
                  <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credits Section Skeleton */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
