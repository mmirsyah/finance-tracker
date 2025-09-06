'use client';

import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { ReactNode } from 'react';

interface PullToRefreshWrapperProps {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  children: ReactNode;
  className?: string;
}

const PullToRefreshWrapper = ({ 
  onRefresh, 
  threshold = 80, 
  children,
  className = ''
}: PullToRefreshWrapperProps) => {
  const {
    isRefreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePullToRefresh({ onRefresh, threshold });

  return (
    <div 
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <PullToRefreshIndicator 
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div className={isRefreshing ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshWrapper;