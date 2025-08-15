// src/components/skeletons/ReportSkeleton.tsx

const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-2/3 animate-pulse"></div>
    </div>
  );

  export default function ReportSkeleton() {
    return (
      <div className="p-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-9 w-64 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="h-6 w-1/2 bg-gray-200 rounded mb-6 animate-pulse"></div>
            <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

         {/* Insight Tables Skeleton */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-6 animate-pulse"></div>
                <div className="space-y-4">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-6 animate-pulse"></div>
                 <div className="space-y-4">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>
         </div>
      </div>
    );
  }