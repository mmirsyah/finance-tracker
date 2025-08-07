// src/components/skeletons/DashboardSkeleton.tsx

const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex items-center space-x-4">
      <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const SkeletonChartCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
    <div className="h-6 w-1/2 bg-gray-200 rounded mb-6 animate-pulse"></div>
    <div className="h-72 bg-gray-200 rounded animate-pulse"></div>
  </div>
);

const SkeletonBarListCard = () => (
    <div className="bg-white p-6 rounded-lg shadow">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-6 animate-pulse"></div>
        <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
    </div>
);


export default function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-pulse"></div>
        </div>
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts Skeleton */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SkeletonChartCard className="lg:col-span-3" />
        <SkeletonChartCard className="lg:col-span-2" />
        <div className="lg:col-span-5"><SkeletonBarListCard /></div>
      </div>
    </div>
  );
}
