import { useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

interface PullToRefreshState {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
}

export const usePullToRefresh = ({ onRefresh, threshold = 80 }: PullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isRefreshing: false,
    pullDistance: 0,
    isPulling: false
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start tracking if we're at the top of the scrollable area
    if (e.currentTarget.scrollTop === 0) {
      setState(prev => ({ ...prev, isPulling: true }));
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isPulling) return;

    const touch = e.touches[0];
    const scrollTop = e.currentTarget.scrollTop;
    
    // Only track pull if we're at the top of the scrollable area
    if (scrollTop === 0) {
      const pullDistance = Math.max(0, touch.clientY - (e.currentTarget as HTMLElement).offsetTop);
      setState(prev => ({ 
        ...prev, 
        pullDistance: Math.min(pullDistance, threshold * 2) // Limit pull distance
      }));
    }
  }, [state.isPulling, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;

    // If pulled enough, trigger refresh
    if (state.pullDistance >= threshold) {
      setState(prev => ({ 
        ...prev, 
        isRefreshing: true,
        isPulling: false,
        pullDistance: 0
      }));
      
      try {
        await onRefresh();
      } finally {
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false,
          pullDistance: 0
        }));
      }
    } else {
      // Reset if not pulled enough
      setState(prev => ({ 
        ...prev, 
        isPulling: false,
        pullDistance: 0
      }));
    }
  }, [state, threshold, onRefresh]);

  return {
    ...state,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};