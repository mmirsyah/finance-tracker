// src/components/dashboard/BudgetQuickView.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    getBudgetSummary,
    getBudgetPriorities,
    setBudgetPriority,
    removeBudgetPriority,
    getAllBudgetCategoriesForPeriod
} from '@/lib/budgetService';
import { BudgetSummaryItem, BudgetCategoryListItem } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Info, Star, PlusCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from 'date-fns';

const BudgetQuickViewSkeleton = () => (
    <div className="space-y-4">
      <div className="h-5 w-3/4 rounded-md bg-gray-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded-md bg-gray-200 animate-pulse" />
      <div className="mt-6 space-y-6">
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
      </div>
    </div>
  );

const AddPriorityPopover = ({ 
    dateRange, 
    existingPriorities, 
    onPriorityAdded 
}: { 
    dateRange: DateRange | undefined, 
    existingPriorities: Set<number>,
    onPriorityAdded: () => void
}) => {
    const [open, setOpen] = useState(false);
    const [allBudgets, setAllBudgets] = useState<BudgetCategoryListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenChange = async (isOpen: boolean) => {
        if (isOpen && dateRange?.from) {
            setIsLoading(true);
            try {
                const periodDate = format(dateRange.from, 'yyyy-MM-dd');
                const { untracked } = await getAllBudgetCategoriesForPeriod(periodDate);
                console.log("Untracked categories from API:", untracked);
                const filteredUntracked = untracked.filter(item => item.category_id !== undefined && item.category_id !== null);
                setAllBudgets(filteredUntracked);
            } catch {
                toast.error("Gagal memuat daftar kategori.");
            } finally {
                setIsLoading(false);
            }
        }
        setOpen(isOpen);
    }

    const handleSelectCategory = async (categoryId: number) => {
        try {
            await setBudgetPriority(categoryId);
            toast.success('Prioritas ditambahkan.');
            onPriorityAdded();
        } catch {
            toast.error('Gagal menambahkan prioritas.');
        } finally {
            setOpen(false);
        }
    }

    const availableBudgets = allBudgets.filter(b => !existingPriorities.has(b.category_id));

    const buildCategoryTree = (categories: BudgetCategoryListItem[]) => {
        const parents = categories.filter(cat => cat.parent_id === null);
        const children = categories.filter(cat => cat.parent_id !== null);

        return parents.map(parent => ({
            ...parent,
            subcategories: children.filter(child => child.parent_id === parent.category_id)
        }));
    };

    const categoryTree = buildCategoryTree(availableBudgets);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="absolute right-4 top-4">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Cari kategori..." />
                    <CommandList>
                        {isLoading && <div className="p-4 text-sm text-center">Memuat...</div>}
                        <CommandEmpty>Tidak ada kategori ditemukan.</CommandEmpty>
                        <CommandGroup key="available-budgets">
                            {categoryTree.map((parentCategory) => (
                                <div key={parentCategory.category_id}>
                                    <CommandItem
                                        key={parentCategory.category_id}
                                        value={parentCategory.category_name}
                                        onSelect={() => handleSelectCategory(parentCategory.category_id)}
                                    >
                                        {parentCategory.category_name}
                                    </CommandItem>
                                    {parentCategory.subcategories.map((subCategory) => (
                                        <CommandItem
                                            key={subCategory.category_id}
                                            value={subCategory.category_name}
                                            onSelect={() => handleSelectCategory(subCategory.category_id)}
                                            className="pl-8"
                                        >
                                            {subCategory.category_name}
                                        </CommandItem>
                                    ))}
                                </div>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


interface BudgetQuickViewProps {
  dateRange: DateRange | undefined;
}

export default function BudgetQuickView({ dateRange }: BudgetQuickViewProps) {
  const [budgets, setBudgets] = useState<BudgetSummaryItem[]>([]);
  const [priorities, setPriorities] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchBudgetAndPriorities = useCallback(async () => {
    if (!dateRange?.from) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const periodDate = format(dateRange.from, 'yyyy-MM-dd');

      const [{ tracked }, summaryData, priorityIds] = await Promise.all([
        getAllBudgetCategoriesForPeriod(periodDate),
        getBudgetSummary(periodDate),
        getBudgetPriorities(),
      ]);

      const priorityIdSet = new Set(priorityIds);
      setPriorities(priorityIdSet);

      const budgetMap = new Map(summaryData.map(item => [item.category_id, item]));

      const enrichedBudgets = tracked
        .map(cat => {
          const summary = budgetMap.get(cat.category_id);
          return {
            ...cat,
            ...summary,
            spent_amount: summary?.spent_amount || 0,
            assigned_amount: summary?.assigned_amount || 0,
            progress_percentage: summary?.progress_percentage || 0,
            remaining_amount: summary?.remaining_amount || 0,
          };
        })
        .filter(b => b.category_id);

      setBudgets(enrichedBudgets);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pantauan budget.');
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchBudgetAndPriorities();
  }, [fetchBudgetAndPriorities]);

  const handleTogglePriority = async (categoryId: number) => {
    try {
        await removeBudgetPriority(categoryId);
        toast.info('Prioritas dihapus.');
        // Refetch data to update the view
        await fetchBudgetAndPriorities(); 
    } catch {
        toast.error('Gagal menghapus prioritas.');
    }
  };

  const renderContent = () => {
    if (isLoading) return <BudgetQuickViewSkeleton />;
    
    if (budgets.length === 0) return (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 h-40">
            <Info className="w-8 h-8 mb-2" />
            <p className="font-medium">Tidak ada prioritas</p>
            <p className="text-sm text-gray-400">
                Klik ikon &apos;+&apos; untuk memilih budget yang ingin dipantau.
            </p>
        </div>
    );
    return (
      <TooltipProvider delayDuration={100}>
        <div className="space-y-6">
            {budgets.map((item) => {
            const progress = Math.min(item.progress_percentage, 100);
            const isOverspent = item.remaining_amount < 0;
            return (
                <div key={item.category_id} className="group">
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <div className="flex items-center gap-2 truncate">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button onClick={() => handleTogglePriority(item.category_id)}>
                                        <Star
                                            className={cn('w-4 h-4 text-yellow-500 fill-yellow-500 transition-all hover:text-yellow-600')}
                                        />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><p>Hapus dari Prioritas</p></TooltipContent>
                            </Tooltip>
                            <span className="font-medium text-foreground truncate">{item.category_name}</span>
                        </div>
                        <span className={cn('font-semibold flex-shrink-0', isOverspent ? 'text-destructive' : 'text-muted-foreground')}>
                        {isOverspent ? `Lebih ${formatCurrency(Math.abs(item.remaining_amount))}` : `${formatCurrency(item.remaining_amount)} tersisa`}
                        </span>
                    </div>
                    <Progress value={progress} className={cn('h-2 w-full rounded-full bg-muted  overflow-hidden', 
                      progress < 75 && !isOverspent && '[&>div]:bg-primary', progress >= 75 && !isOverspent && '[&>div]:bg-warning', isOverspent && '[&>div]:bg-destructive')} />
                    <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                        <span>{formatCurrency(item.spent_amount)}</span>
                        <span>dari {formatCurrency(item.assigned_amount)}</span>
                    </div>
                </div>
            );
            })}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <Card className="relative">
      <CardHeader className="relative">
        <CardTitle className="text-base md:text-lg">Pantauan Budget</CardTitle>
        <CardDescription>
          Kategori budget yang Anda prioritaskan.
        </CardDescription>
        <AddPriorityPopover 
            dateRange={dateRange}
            existingPriorities={priorities}
            onPriorityAdded={fetchBudgetAndPriorities}
        />
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}