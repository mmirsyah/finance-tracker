'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BudgetProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

export const BudgetProgressBar = ({ value, max, className }: BudgetProgressBarProps) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const isOverspent = value > max;
  const progressValue = Math.min(percentage, 100);

  return (
    <Progress
      value={progressValue}
      className={cn(
        'h-2 w-full rounded-full bg-muted overflow-hidden',
        percentage < 75 && !isOverspent && '[&>div]:bg-primary',
        percentage >= 75 && !isOverspent && '[&>div]:bg-warning',
        isOverspent && '[&>div]:bg-destructive',
        className
      )}
    />
  );
};
