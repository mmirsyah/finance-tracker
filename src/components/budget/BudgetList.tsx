// src/components/budget/BudgetList.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetParentCategoryData, BudgetCategoryData } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { BudgetCard } from './BudgetCard';
import { getBudgetPriorities, setBudgetPriority, removeBudgetPriority, toggleFlexBudgetStatus } from '@/lib/budgetService';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useAppData } from '@/contexts/AppDataContext';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


interface BudgetListProps {
  data: (BudgetParentCategoryData | (BudgetCategoryData & { children: [], is_rollover: boolean, is_flex_budget: boolean, unallocated_balance: number }))[];
  onAssignmentChange: (categoryId: number, newAmount: number) => void;
  onRefresh: () => void;
  currentPeriodStart: Date;
}

export const BudgetList = ({ data, onAssignmentChange, onRefresh, currentPeriodStart }: BudgetListProps) => {
  const { householdId } = useAppData();
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>(() => {
    const initialState: Record<number, boolean> = {};
    data.forEach(item => {
      if ((item as BudgetParentCategoryData).children?.length > 0) {
        initialState[item.id] = true; // Default open
      }
    });
    return initialState;
  });
  const [priorities, setPriorities] = useState<Set<number>>(new Set());
  const [isSwitchingFlex, setIsSwitchingFlex] = useState<number | null>(null);


  useEffect(() => {
    const fetchPriorities = async () => {
        const priorityIds = await getBudgetPriorities();
        setPriorities(new Set(priorityIds));
    };
    fetchPriorities();
  }, []);

  const toggleCategory = (id: number) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTogglePriority = async (categoryId: number) => {
    const isPriority = priorities.has(categoryId);
    const newPriorities = new Set(priorities);

    try {
        if (isPriority) {
            await removeBudgetPriority(categoryId);
            newPriorities.delete(categoryId);
            toast.info('Prioritas dihapus.');
        } else {
            await setBudgetPriority(categoryId);
            newPriorities.add(categoryId);
            toast.success('Prioritas ditambahkan.');
        }
        setPriorities(newPriorities);
    } catch {
        toast.error('Gagal memperbarui prioritas.');
    }
  };

  const handleToggleFlex = async (categoryId: number, newStatus: boolean) => {
    if (!householdId) return;
    setIsSwitchingFlex(categoryId);
    try {
        await toggleFlexBudgetStatus(householdId, categoryId, currentPeriodStart, newStatus);
        toast.success(`Mode Flex Budget telah di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`);
        onRefresh();
    } catch {
        toast.error('Gagal mengubah mode flex.');
    } finally {
        setIsSwitchingFlex(null);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed rounded-lg mt-6">
        <h3 className="text-lg font-medium">Tidak Ada Kategori Anggaran</h3>
        <p className="text-sm text-muted-foreground">Silakan tambahkan kategori pengeluaran terlebih dahulu untuk memulai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(item => {
        const isGroup = (item as BudgetParentCategoryData).children?.length > 0;

        if (isGroup) {
          const parent = item as BudgetParentCategoryData;
          const isFlex = parent.is_flex_budget;
          const unallocatedColor = parent.unallocated_balance >= 0 ? 'text-primary' : 'text-destructive';

          return (
            <div key={parent.id} className="bg-gray-50/50 border border-gray-200/80 rounded-lg">
              <Collapsible open={openCategories[parent.id]} onOpenChange={() => toggleCategory(parent.id)}>
                <div className="p-3 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <CollapsibleTrigger className="flex items-center gap-2 flex-grow text-left">
                      {openCategories[parent.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <span className="font-semibold text-lg">{parent.name}</span>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-3">
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                        {isSwitchingFlex === parent.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" /> 
                                        ) : (
                                            <Switch
                                                checked={isFlex}
                                                onCheckedChange={(newStatus) => handleToggleFlex(parent.id, newStatus)}
                                            />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>Aktifkan &quot;Flex Budget&quot; untuk grup ini</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <div className="text-right">
                            <p className="font-bold text-gray-800">{formatCurrency(parent.available)}</p>
                            {isFlex && <p className={`text-xs ${unallocatedColor}`}>Sisa Flex: {formatCurrency(parent.unallocated_balance)}</p>}
                        </div>
                    </div>
                  </div>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  {parent.children.map(child => (
                    <BudgetCard 
                      key={child.id} 
                      category={child} 
                      onAssignmentChange={onAssignmentChange}
                      onRefresh={onRefresh}
                      isPriority={priorities.has(child.id)}
                      onTogglePriority={handleTogglePriority}
                      currentPeriodStart={currentPeriodStart}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        } else {
            const standalone = item as (BudgetCategoryData & { is_rollover: boolean });
            return (
                <BudgetCard 
                  key={standalone.id} 
                  category={standalone} 
                  onAssignmentChange={onAssignmentChange}
                  onRefresh={onRefresh}
                  isPriority={priorities.has(standalone.id)}
                  onTogglePriority={handleTogglePriority}
                  currentPeriodStart={currentPeriodStart}
                />
            )
        }
      })}
    </div>
  );
};
