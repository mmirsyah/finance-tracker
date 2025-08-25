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
                const data = await getAllBudgetCategoriesForPeriod(periodDate);
                setAllBudgets(data);
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
                        <CommandGroup>
                            {availableBudgets.map((budget) => (
                                <CommandItem
                                    key={budget.category_id}
                                    value={budget.category_name}
                                    onSelect={() => handleSelectCategory(budget.category_id)}
                                >
                                    {budget.category_name}
                                </CommandItem>
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
    if (!dateRange?.from) return;
    
    setIsLoading(true);
    try {
      const periodDate = format(dateRange.from, 'yyyy-MM-dd');
      
      // Fetch both summary for all categories and the list of priority IDs
      const [summaryData, priorityIds] = await Promise.all([
        getBudgetSummary(periodDate),
        getBudgetPriorities()
      ]);

      const priorityIdSet = new Set(priorityIds);
      setPriorities(priorityIdSet);
      
      // Filter the summary data locally based on priority IDs
      if (priorityIdSet.size > 0) {
        const filteredBudgets = summaryData.filter(item => priorityIdSet.has(item.category_id));
        setBudgets(filteredBudgets);
      } else {
        setBudgets([]); // If no priorities, show nothing
      }

    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pantauan budget.');
    } finally {
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
                                            className={cn('w-4 h-4 text-yellow-400 fill-yellow-400 transition-all hover:text-yellow-500')}
                                        />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><p>Hapus dari Prioritas</p></TooltipContent>
                            </Tooltip>
                            <span className="font-medium text-gray-700 truncate">{item.category_name}</span>
                        </div>
                        <span className={cn('font-semibold flex-shrink-0', isOverspent ? 'text-red-600' : 'text-gray-600')}>
                        {isOverspent ? `Lebih ${formatCurrency(Math.abs(item.remaining_amount))}` : `${formatCurrency(item.remaining_amount)} tersisa`}
                        </span>
                    </div>
                    <Progress value={progress} className={cn('h-2', progress > 85 && !isOverspent && '[&>div]:bg-yellow-500', isOverspent && '[&>div]:bg-red-600')} />
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
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
    <Card className="h-full">
      <CardHeader className="relative">
        <CardTitle>Pantauan Budget</CardTitle>
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