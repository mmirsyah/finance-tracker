// src/components/skeletons/TableSkeleton.tsx

const SkeletonRow = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
    </td>
  </tr>
);

export default function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-2/5">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-2/5">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </th>
            <th scope="col" className="relative px-6 py-3 w-1/5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </tbody>
      </table>
    </div>
  );
}
