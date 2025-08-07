// src/components/skeletons/TransactionListSkeleton.tsx

const SkeletonTransactionItem = () => (
    <li className="flex items-center p-3">
        <div className="flex-grow space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4">
            <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse hidden md:block"></div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
    </li>
);

const SkeletonGroup = () => (
    <div className="bg-white rounded-lg shadow">
        <header className="flex justify-between items-center p-3 bg-gray-50 border-b">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </header>
        <ul className="divide-y divide-gray-200">
            <SkeletonTransactionItem />
            <SkeletonTransactionItem />
            <SkeletonTransactionItem />
        </ul>
    </div>
);

export default function TransactionListSkeleton() {
  return (
    <div className="space-y-4">
        <SkeletonGroup />
        <SkeletonGroup />
    </div>
  );
}
