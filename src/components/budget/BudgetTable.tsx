// src/components/budget/BudgetTable.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetParentCategoryData, BudgetCategoryData, BudgetHistoryData } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Loader2, Repeat, Star } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart } from '@tremor/react';
import { toast } from 'sonner';
import { 
    updateCategoryRolloverStatus, 
    toggleFlexBudgetStatus, 
    getCategorySpendingHistory,
    getBudgetPriorities,
    setBudgetPriority,
    removeBudgetPriority
} from '@/lib/budgetService';
import { useAppData } from '@/contexts/AppDataContext';

interface BudgetTableProps {
  data: (BudgetParentCategoryData | (BudgetCategoryData & { children: [], is_rollover: boolean, is_flex_budget: boolean, unallocated_balance: number }))[];
  onAssignmentChange: (categoryId: number, newAmount: number) => void;
  onRefresh: () => void;
  currentPeriodStart: Date;
}

const BudgetingAssistant = ({ category, onApply, currentPeriodStart, onOpenChange }: { category: BudgetCategoryData, onApply: (amount: number) => void, currentPeriodStart: Date, onOpenChange: (open: boolean) => void }) => {
    const { householdId } = useAppData();
    const [history, setHistory] = useState<BudgetHistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!householdId) return;
        
        getCategorySpendingHistory(householdId, category.id, currentPeriodStart)
            .then(data => {
                setHistory(data);
            })
            .catch(error => {
                toast.error("Gagal memuat histori pengeluaran.");
                console.error(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [householdId, category.id, currentPeriodStart]);
    
    const handleApply = (amount: number) => {
        onApply(amount);
        onOpenChange(false);
    };

    return (
        <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
                <p className="text-sm font-semibold text-center border-b pb-2">Bantuan Anggaran</p>
                {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                ) : history && history.monthly_history ? (
                    <div className="space-y-4">
                        <BarChart
                            data={history.monthly_history}
                            index="month"
                            categories={["Pengeluaran"]}
                            colors={["blue"]}
                            valueFormatter={formatCurrency}
                            yAxisWidth={60}
                            showLegend={false}
                            className="h-32 mt-2"
                        />
                        <div className="space-y-2 text-sm border-t pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Rata-rata 3 Bln Terakhir</span>
                                    <span className="font-semibold">{formatCurrency(history.three_month_avg)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Pengeluaran Bulan Lalu</span>
                                    <span className="font-semibold">{formatCurrency(history.last_month_spending)}</span>
                                </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleApply(history.last_month_spending)}>
                                Pakai Bln Lalu
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleApply(history.three_month_avg)}>
                                Pakai Rata-rata
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground h-48 flex items-center justify-center">
                        Tidak ada data histori pengeluaran untuk kategori ini.
                    </p>
                )}
            </div>
        </PopoverContent>
    );
};

const CategoryRow = ({ 
    category, 
    onAssignmentChange,
    onRefresh,
    currentPeriodStart,
    isParent = false,
    isStandalone = false,
    isChild = false,
    isCollapsibleOpen = false,
    isPriority,
    onTogglePriority,
}: { 
    category: BudgetCategoryData | BudgetParentCategoryData; 
    onAssignmentChange: (categoryId: number, newAmount: number) => void;
    onRefresh: () => void;
    currentPeriodStart: Date;
    isParent?: boolean;
    isStandalone?: boolean;
    isChild?: boolean;
    isCollapsibleOpen?: boolean;
    isPriority: boolean;
    onTogglePriority: (categoryId: number) => void;
}) => {
    const { householdId } = useAppData();
    const [inputValue, setInputValue] = useState<string>(category.assigned > 0 ? String(category.assigned) : '');
    const [isSwitching, setIsSwitching] = useState(false);
    const [isRolloverActive, setIsRolloverActive] = useState(category.is_rollover);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    useEffect(() => {
        setIsRolloverActive(category.is_rollover);
    }, [category.is_rollover]);

    const parentData = isParent ? (category as BudgetParentCategoryData) : null;
    const isFlexMode = parentData?.is_flex_budget ?? false;

    useEffect(() => {
        if (document.activeElement?.id !== `budget-input-${category.id}`) {
            setInputValue(category.assigned > 0 ? String(category.assigned) : '');
        }
    }, [category.assigned, category.id]);

    const debouncedSave = useDebouncedCallback((value: number) => {
        onAssignmentChange(category.id, value);
    }, 750);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        const numberValue = parseFloat(value);
        if (!isNaN(numberValue) && numberValue >= 0) {
            debouncedSave(numberValue);
        } else if (value === '') {
            debouncedSave(0);
        }
    };
    
    const handleApplyFromAssistant = (amount: number) => {
        const roundedAmount = Math.ceil(amount / 1000) * 1000;
        setInputValue(String(roundedAmount));
        onAssignmentChange(category.id, roundedAmount);
    };

    const handleToggleRollover = async (newStatus: boolean) => {
        setIsRolloverActive(newStatus);
        setIsSwitching(true);
        try {
            await updateCategoryRolloverStatus(category.id, newStatus);
            toast.success(`Rollover untuk "${category.name}" telah di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`);
            onRefresh(); 
        } catch {
            toast.error('Gagal mengubah status rollover.');
            setIsRolloverActive(!newStatus);
        } finally {
            setIsSwitching(false);
        }
    };

    const handleToggleFlex = async (newStatus: boolean) => {
        if (!householdId) return;
        setIsSwitching(true);
        try {
            await toggleFlexBudgetStatus(householdId, category.id, currentPeriodStart, newStatus);
            toast.success(`Mode Flex Budget untuk "${category.name}" telah di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`);
            onRefresh();
        } catch {
            toast.error('Gagal mengubah mode flex.');
        } finally {
            setIsSwitching(false);
        }
    };

    const availableColor = category.available >= 0 ? 'text-green-600' : 'text-red-600';
    const activityDisplay = category.activity > 0 ? formatCurrency(-category.activity) : formatCurrency(0);
    
    const isInputDisabled = isParent && !isFlexMode;
    const unallocatedBalance = parentData?.unallocated_balance;
    const unallocatedColor = unallocatedBalance !== undefined && unallocatedBalance >= 0 ? 'text-blue-600' : 'text-orange-600';

    return (
        <div className={cn("grid grid-cols-12 gap-x-4 items-center py-2 px-3", 
            isParent ? "font-semibold bg-gray-50/75" : "border-t", 
            isStandalone && "font-medium"
        )}>
            <div className="col-span-4 flex items-center gap-2 truncate">
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <button onClick={() => onTogglePriority(category.id)} className="p-1 -ml-1 flex-shrink-0">
                                <Star
                                className={cn(
                                    'w-4 h-4 text-gray-300 transition-all hover:text-yellow-400',
                                    isPriority && 'text-yellow-400 fill-yellow-400'
                                )}
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isPriority ? 'Hapus dari Prioritas' : 'Jadikan Prioritas'}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {isChild && <div className="w-4 flex-shrink-0"></div>}
                {isParent && (
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 flex-shrink-0">
                            {isCollapsibleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </CollapsibleTrigger>
                )}
                {isParent && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex-shrink-0">
                                {isSwitching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" /> 
                                ):(
                                <Switch
                                    checked={isFlexMode}
                                    onCheckedChange={handleToggleFlex}
                                />
                                )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Aktifkan &quot;Flex Budget&quot; untuk grup ini</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                {(isChild || isStandalone) && isRolloverActive && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>
                                <Repeat className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent><p>Rollover aktif</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <span className="truncate">{category.name}</span>
            </div>
            
            <div className="col-span-2 text-right text-sm text-gray-500 hidden md:block">
                {formatCurrency(category.rollover)}
            </div>

            <div className="col-span-2">
                    <Popover open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
                        <PopoverTrigger asChild>
                            <Input 
                                id={`budget-input-${category.id}`}
                                type="number"
                                placeholder="0"
                                value={inputValue}
                                onChange={handleInputChange}
                                onFocus={() => { if(!isInputDisabled) setIsAssistantOpen(true) }}
                                disabled={isInputDisabled}
                                className={cn("h-8 text-right", isInputDisabled ? "bg-gray-100 text-gray-500 border-none" : "bg-blue-50 focus:bg-white")}
                            />
                        </PopoverTrigger>
                        {isAssistantOpen && <BudgetingAssistant category={category as BudgetCategoryData} onApply={handleApplyFromAssistant} currentPeriodStart={currentPeriodStart} onOpenChange={setIsAssistantOpen} />}
                    </Popover>
            </div>
            
            <div className="col-span-2 text-right text-sm">{activityDisplay}</div>
            
            <div className={cn("col-span-1 text-right font-medium", availableColor)}>
                {formatCurrency(category.available)}
                {isParent && isFlexMode && unallocatedBalance !== undefined && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className={cn("text-xs font-normal cursor-help", unallocatedColor)}>
                                        (Flex: {formatCurrency(unallocatedBalance)})
                                    </p>
                                </TooltipTrigger>
                                <TooltipContent><p>Sisa dana fleksibel untuk sub-kategori.</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                )}
            </div>

            <div className="col-span-1 flex justify-center">
                { (isChild || isStandalone) && (
                    isSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    <Switch checked={isRolloverActive} onCheckedChange={handleToggleRollover} />
                )}
            </div>
        </div>
    );
};

export const BudgetTable = ({ data, onAssignmentChange, onRefresh, currentPeriodStart }: BudgetTableProps) => {
    const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({});
    const [priorities, setPriorities] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchPriorities = async () => {
            const priorityIds = await getBudgetPriorities();
            setPriorities(new Set(priorityIds));
        };
        fetchPriorities();
    }, []);

    useEffect(() => {
        const initialOpenState: Record<number, boolean> = {};
        if (data) {
            data.forEach(item => {
                const parentItem = item as BudgetParentCategoryData;
                if (parentItem.children && parentItem.children.length > 0) {
                    initialOpenState[item.id] = true;
                }
            });
        }
        setOpenCategories(initialOpenState);
    }, [data]);

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
        } catch { // <-- PERBAIKAN: Hapus parameter 'error' yang tidak dipakai
            toast.error('Gagal memperbarui prioritas.');
        }
    };

    if (!data) return <div className="text-center p-8 border rounded-lg">Memuat data anggaran...</div>
    if (data.length === 0) return <div className="text-center p-8 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium">Tidak Ada Kategori Anggaran</h3>
        <p className="text-sm text-muted-foreground">Silakan tambahkan kategori pengeluaran terlebih dahulu.</p>
    </div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <div className="grid grid-cols-12 gap-x-4 py-2 px-3 border-b bg-gray-50 text-xs font-bold text-gray-600 uppercase sticky top-[65px] z-10">
                <div className="col-span-4 text-left">Kategori</div>
                <div className="col-span-2 text-right hidden md:block">Sisa Bulan Lalu</div>
                <div className="col-span-2 text-right">Dialokasikan</div>
                <div className="col-span-2 text-right">Aktivitas</div>
                <div className="col-span-1 text-right">Tersedia</div>
                <div className="col-span-1 text-center">Rollover</div>
            </div>

            <div>
                {data.map(item => {
                    const parentCategory = item as BudgetParentCategoryData;
                    const isGroup = parentCategory.children && parentCategory.children.length > 0;

                    return isGroup ? (
                        <Collapsible key={item.id} open={openCategories[item.id] !== false} onOpenChange={() => toggleCategory(item.id)}>
                            <CategoryRow 
                                category={item} 
                                onAssignmentChange={onAssignmentChange} 
                                onRefresh={onRefresh} 
                                currentPeriodStart={currentPeriodStart} 
                                isParent={true} 
                                isCollapsibleOpen={openCategories[item.id] !== false}
                                isPriority={priorities.has(item.id)}
                                onTogglePriority={handleTogglePriority}
                            />
                            <CollapsibleContent>
                                {parentCategory.children.map(childCat => (
                                    <CategoryRow 
                                        key={childCat.id} 
                                        category={childCat} 
                                        onAssignmentChange={onAssignmentChange} 
                                        onRefresh={onRefresh} 
                                        currentPeriodStart={currentPeriodStart}
                                        isChild={true}
                                        isPriority={priorities.has(childCat.id)}
                                        onTogglePriority={handleTogglePriority}
                                    />
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    ) : (
                        <CategoryRow 
                            key={item.id} 
                            category={item} 
                            onAssignmentChange={onAssignmentChange} 
                            onRefresh={onRefresh} 
                            currentPeriodStart={currentPeriodStart} 
                            isStandalone={true} 
                            isPriority={priorities.has(item.id)}
                            onTogglePriority={handleTogglePriority}
                        />
                    )
                })}
            </div>
        </div>
    );
};