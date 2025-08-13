// src/components/budget/BudgetCategoryRow.tsx

import { Category } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

export const BudgetCategoryRow = ({
  category,
  budgetAmount,
  spendingAmount,
  onBudgetChange,
  onSave,
  isSaving,
}: {
  category: Category;
  budgetAmount: number;
  spendingAmount: number;
  onBudgetChange: (categoryId: number, amount: number) => void;
  onSave: (categoryId: number) => Promise<void>;
  isSaving: boolean;
}) => {
  const remaining = budgetAmount - spendingAmount;
  const progress = budgetAmount > 0 ? (spendingAmount / budgetAmount) * 100 : 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center py-2 px-2 hover:bg-gray-50">
        <div className="flex-1 text-sm font-medium">{category.name}</div>
        <div className="w-40 px-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              value={budgetAmount || ''}
              onChange={(e) => onBudgetChange(category.id, parseFloat(e.target.value) || 0)}
              className="h-8 text-sm text-right"
            />
            <Button size="sm" variant="outline" onClick={() => onSave(category.id)} disabled={isSaving} className="w-16">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </div>
        <div className="w-32 text-right text-sm px-2">{formatCurrency(spendingAmount)}</div>
        <div className="w-32 text-right px-2">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", { "bg-green-100 text-green-800": remaining >= 0, "bg-red-100 text-red-800": remaining < 0, })}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>
      <Progress value={progress} className="w-full h-1 mt-1" />
    </div>
  );
};