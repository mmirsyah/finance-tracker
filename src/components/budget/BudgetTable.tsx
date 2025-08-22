// src/components/budget/BudgetTable.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetParentCategoryData, BudgetCategoryData } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
// PERBAIKAN: Menghapus 'Zap' dari impor
import { ChevronDown, ChevronRight, Loader2, Repeat } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { updateCategoryRolloverStatus, toggleFlexBudgetStatus } from '@/lib/budgetService';
import { useAppData } from '@/contexts/AppDataContext';
// PERBAIKAN: Menghapus 'formatDate' dan 'startOfMonth' dari impor
import { format as formatDate } from 'date-fns';

interface BudgetTableProps {
  data: (BudgetParentCategoryData | (BudgetCategoryData & { children: [], is_rollover: boolean, is_flex_budget: boolean, unallocated_balance: number }))[];
  onAssignmentChange: (categoryId: number, newAmount: number) => void;
  onRefresh: () => void;
  currentPeriodStart: Date;
}

const CategoryRow = ({ 
    category, 
    onAssignmentChange,
    onRefresh,
    currentPeriodStart,
    isParent = false,
    isStandalone = false,
    isChild = false,
    isCollapsibleOpen = false,
}: { 
    category: BudgetCategoryData | BudgetParentCategoryData; 
    onAssignmentChange: (categoryId: number, newAmount: number) => void;
    onRefresh: () => void;
    currentPeriodStart: Date;
    isParent?: boolean;
    isStandalone?: boolean;
    isChild?: boolean;
    isCollapsibleOpen?: boolean;
}) => {
    const { householdId } = useAppData();
    const [inputValue, setInputValue] = useState<string>(category.assigned > 0 ? String(category.assigned) : '');
    const [isSwitching, setIsSwitching] = useState(false);
    const [isRolloverActive, setIsRolloverActive] = useState(category.is_rollover);

    useEffect(() => {
        setIsRolloverActive(category.is_rollover);
    }, [category.is_rollover]);

    const parentData = isParent ? (category as BudgetParentCategoryData) : null;
    const isFlexMode = parentData?.is_flex_budget ?? false;

    useEffect(() => {
        setInputValue(category.assigned > 0 ? String(category.assigned) : '');
    }, [category.assigned]);

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
            {/* Kolom Kategori (col-span-4) */}
            <div className="col-span-4 flex items-center gap-2 truncate">
                {isChild && <div className="w-8 flex-shrink-0"></div>}
                
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
                            {/* PERBAIKAN: Mengganti " dengan &quot; */}
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
            
            {/* Kolom Sisa Periode Lalu (col-span-2) */}
            <div className="col-span-2 text-right text-sm text-gray-500 hidden md:block">
                {formatCurrency(category.rollover)}
            </div>

            {/* Kolom Alokasi (col-span-2) */}
            <div className="col-span-2">
                 <Input 
                    type="number"
                    placeholder="0"
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={isInputDisabled}
                    className={cn("h-8 text-right", isInputDisabled ? "bg-gray-100 text-gray-500 border-none" : "bg-blue-50 focus:bg-white")}
                />
            </div>
            
            {/* Kolom Aktivitas (col-span-2) */}
            <div className="col-span-2 text-right text-sm">{activityDisplay}</div>
            
            {/* Kolom Tersedia (col-span-1) */}
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

            {/* Kolom Rollover (col-span-1) */}
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

    useEffect(() => {
        const initialOpenState: Record<number, boolean> = {};
        if (data) {
            data.forEach(item => {
                // PERBAIKAN: Menghapus @ts-ignore yang tidak perlu
                if (item.children && item.children.length > 0) {
                    initialOpenState[item.id] = true;
                }
            });
        }
        setOpenCategories(initialOpenState);
    }, [data]);

    const toggleCategory = (id: number) => {
        setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (!data) return <div className="text-center p-8 border rounded-lg">Memuat data anggaran...</div>
    if (data.length === 0) return <div className="text-center p-8 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium">Tidak Ada Kategori Anggaran</h3>
        <p className="text-sm text-muted-foreground">Silakan tambahkan kategori pengeluaran terlebih dahulu.</p>
    </div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Header Table */}
            <div className="grid grid-cols-12 gap-x-4 py-2 px-3 border-b bg-gray-50 text-xs font-bold text-gray-600 uppercase sticky top-[65px] z-10">
                <div className="col-span-4 text-left">Kategori</div>
                <div className="col-span-2 text-right hidden md:block">Sisa Bulan Lalu</div>
                <div className="col-span-2 text-right">Dialokasikan</div>
                <div className="col-span-2 text-right">Aktivitas</div>
                <div className="col-span-1 text-right">Tersedia</div>
                <div className="col-span-1 text-center">Rollover</div>
            </div>

            {/* Body Table */}
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
                        />
                    )
                })}
            </div>
        </div>
    );
};