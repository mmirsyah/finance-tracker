'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
}

const PullToRefreshIndicator = ({ 
  isRefreshing, 
  pullDistance, 
  threshold 
}: PullToRefreshIndicatorProps) => {
  const [arrowRotation, setArrowRotation] = useState(0);

  useEffect(() => {
    if (!isRefreshing) {
      const progress = Math.min(1, pullDistance / threshold);
      setArrowRotation(progress * 180);
    }
  }, [pullDistance, threshold, isRefreshing]);

  const indicatorHeight = 60;
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: isRefreshing ? indicatorHeight : Math.min(pullDistance, indicatorHeight),
            opacity: 1
          }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex justify-center items-center w-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 50
          }}
        >
          <div className="flex flex-col items-center justify-center pt-2">
            {isRefreshing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                <RefreshCw className="w-6 h-6 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: arrowRotation }}
                transition={{ duration: 0.2 }}
              >
                <RefreshCw 
                  className={`w-6 h-6 ${
                    pullDistance >= threshold 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`} 
                />
              </motion.div>
            )}
            <span className="text-xs mt-1 text-muted-foreground">
              {isRefreshing ? 'Refreshing...' : 
               pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PullToRefreshIndicator;