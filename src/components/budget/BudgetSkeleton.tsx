// src/components/budget/BudgetSkeleton.tsx
export const BudgetSkeleton = () => {
  const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  const SkeletonRow = () => (
    <div className="flex justify-between items-center p-4 border-b">
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-28"></div>
    </div>
  );

  return (
    <div className="animate-pulse">
      {/* Skeleton untuk Summary Cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      
      {/* Skeleton untuk Budget List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
           <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
};