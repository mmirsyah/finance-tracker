// src/components/dashboard/AccountSummarySkeleton.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AccountSummarySkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dynamic Total Balance Skeleton */}
        <div className="bg-gray-200 rounded-lg p-4">
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-3 bg-gray-300 rounded w-1/4 mt-2"></div>
        </div>
        
        {/* Tabs Skeleton */}
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
        
        {/* Account List Skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="flex justify-between items-center p-2">
            <div className="h-4 bg-gray-200 rounded w-2/5"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="flex justify-between items-center p-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSummarySkeleton;