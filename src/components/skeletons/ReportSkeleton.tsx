// src/components/skeletons/ReportSkeleton.tsx

export default function ReportSkeleton() {
    return (
      <div className="p-4 sm:p-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="h-9 w-64 bg-gray-300 rounded"></div>
          <div className="h-10 w-64 bg-gray-200 rounded"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="w-full md:w-[400px] h-10 flex gap-1 mb-6">
            <div className="flex-1 bg-gray-200 rounded-md"></div>
            <div className="flex-1 bg-gray-200 rounded-md"></div>
            <div className="flex-1 bg-gray-200 rounded-md"></div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 w-1/2 bg-gray-200 rounded mb-6"></div>
                <div className="h-80 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="h-24 bg-white rounded-lg shadow-sm border"></div>
                <div className="h-24 bg-white rounded-lg shadow-sm border"></div>
                <div className="h-24 bg-white rounded-lg shadow-sm border"></div>
                <div className="h-24 bg-white rounded-lg shadow-sm border"></div>
            </div>
             {/* --- PERUBAHAN SKELETON DI SINI --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-white rounded-lg shadow-sm border"></div>
                <div className="lg:col-span-1 h-72 bg-white rounded-lg shadow-sm border"></div>
            </div>
        </div>
      </div>
    );
}