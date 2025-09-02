'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from 'sonner';
import { getBudgetDataForPeriod, getReadyToAssign, saveBudgetAssignment } from '@/lib/budgetService';
import { BudgetPageData, BudgetParentCategoryData, BudgetCategoryData } from '@/types';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { getCustomPeriod } from '@/lib/periodUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const ReadyToAssignCard = ({ isLoading, amount }: { isLoading: boolean, amount: number | null }) => {
    if (isLoading || amount === null) {
        return (
            <Card className="w-full md:w-auto">
                <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold text-center text-muted-foreground">Ready to Assign</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="h-9 w-40 bg-muted rounded-md animate-pulse mt-1 mx-auto"></div>
                </CardContent>
            </Card>
        )
    }

    if (amount > 0) {
        return (
            <Card className="w-full md:w-auto bg-primary/10 border-primary/20 shadow-md">
                 <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                    <Wallet className="w-5 h-5 text-primary"/>
                    <CardTitle className="text-sm font-semibold text-primary">Dana Perlu Dialokasikan</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-center">
                    <p className="text-3xl font-bold text-primary">{formatCurrency(amount)}</p>
                    <p className="text-xs text-primary/80 mt-1">Ayo beri setiap rupiah tugas!</p>
                </CardContent>
            </Card>
        )
    }

    if (amount < 0) {
        return (
            <Card className="w-full md:w-auto bg-destructive/10 border-destructive/20 shadow-md">
                <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                    <AlertTriangle className="w-5 h-5 text-destructive"/>
                    <CardTitle className="text-sm font-semibold text-destructive">Anggaran Melebihi Dana</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-center">
                    <p className="text-3xl font-bold text-destructive">{formatCurrency(amount)}</p>
                    <p className="text-xs text-destructive/80 mt-1">Kurangi alokasi di salah satu kategori.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full md:w-auto bg-secondary/10 border-secondary/20 shadow-md">
            <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                <CheckCircle2 className="w-5 h-5 text-secondary-text"/>
                <CardTitle className="text-sm font-semibold text-secondary-text">Kerja Bagus!</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-center">
                <p className="text-3xl font-bold text-secondary-text">{formatCurrency(0)}</p>
                <p className="text-xs text-muted-secondary-text mt-1">Semua dana telah dialokasikan.</p>
            </CardContent>
        </Card>
    );
};


const BudgetView = () => {
  const { householdId, dataVersion, profile, isLoading: isAppDataLoading } = useAppData();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetPageData | null>(null);
  const [readyToAssign, setReadyToAssign] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && !currentDate) {
      setCurrentDate(new Date()); 
    }
  }, [profile, currentDate]);

  const { periodStartDate, periodEndDate } = useMemo(() => {
    if (!profile || !currentDate) {
      return { 
        periodStartDate: new Date(), 
        periodEndDate: new Date(), 
      };
    }
    const startDay = profile.period_start_day || 1;
    const period = getCustomPeriod(startDay, currentDate);
    return { periodStartDate: period.from, periodEndDate: period.to };
  }, [profile, currentDate]);

  const fetchAllBudgetData = useCallback(async () => {
    if (!householdId || !currentDate) return;
    setIsLoading(true);
    try {
      const [budgetDataRes, readyToAssignRes] = await Promise.all([
        getBudgetDataForPeriod(householdId, periodStartDate, periodEndDate),
        getReadyToAssign(householdId)
      ]);
      setBudgetData(budgetDataRes);
      setReadyToAssign(readyToAssignRes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memuat data anggaran.";
      toast.error(errorMessage);
      setBudgetData(null);
    } finally {
      setIsLoading(false);
    }
  }, [householdId, periodStartDate, periodEndDate, currentDate]);

  useEffect(() => {
    if (currentDate) {
        fetchAllBudgetData();
    }
  }, [fetchAllBudgetData, dataVersion, currentDate]);

  const handlePeriodChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };
  
  const handleSyncComplete = () => {
    router.refresh();
  };

  const handleAssignmentChange = async (categoryId: number, newAmount: number) => {
    if (!householdId || !budgetData || readyToAssign === null) return;
    
    const oldBudgetData = JSON.parse(JSON.stringify(budgetData));
    const oldReadyToAssign = readyToAssign;

    let totalAssignedChange = 0;
    let oldAmount = 0;

    const isParentCategory = (cat: BudgetCategoryData | BudgetParentCategoryData): cat is BudgetParentCategoryData => {
        return 'children' in cat && Array.isArray(cat.children);
    };

    budgetData.categories.forEach(cat => {
        if(cat.id === categoryId) {
            oldAmount = cat.assigned;
        } else if (isParentCategory(cat) && cat.children.length > 0) {
            const child = cat.children.find(c => c.id === categoryId);
            if (child) oldAmount = child.assigned;
        }
    });
    totalAssignedChange = newAmount - oldAmount;
    
    setBudgetData(prev => {
        if (!prev) return null;
        const newCategories = JSON.parse(JSON.stringify(prev.categories));
        for (const cat of newCategories) {
            if (cat.id === categoryId) {
                cat.assigned = newAmount;
                break;
            }
            if (isParentCategory(cat) && cat.children && cat.children.length > 0) {
                const child = cat.children.find((c: BudgetCategoryData) => c.id === categoryId);
                if (child) {
                    child.assigned = newAmount;
                    break;
                }
            }
        }

        return {
            ...prev,
            categories: newCategories,
            total_budgeted: (prev.total_budgeted || 0) + totalAssignedChange,
        }
    });
    setReadyToAssign(prev => prev !== null ? prev - totalAssignedChange : null);

    try {
      await saveBudgetAssignment({
        household_id: householdId,
        category_id: categoryId,
        month: format(periodStartDate, 'yyyy-MM-dd'),
        assigned_amount: newAmount,
      });
      await fetchAllBudgetData();
    } catch (error) { 
      toast.error(`Gagal menyimpan: ${(error as Error).message}`);
      setBudgetData(oldBudgetData);
      setReadyToAssign(oldReadyToAssign);
    }
  };

  if (isAppDataLoading || !profile || !currentDate) {
    return (<div className="flex flex-col items-center justify-center h-full p-10"><Loader2 className="w-10 h-10 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Memuat data aplikasi...</p></div>);
  }

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-grow">
                {/* We can keep the title here or move it inside BudgetHeader if preferred */}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <ReadyToAssignCard isLoading={isLoading} amount={readyToAssign} />
            </div>
        </div>

        <BudgetHeader 
            currentMonth={currentDate}
            setCurrentMonth={handlePeriodChange}
            householdId={householdId || ''}
            onSyncComplete={handleSyncComplete}
        />

        {isLoading ? (
             <div className="flex justify-center items-center h-64 bg-card rounded-lg shadow-sm border"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
            <BudgetTable
                data={budgetData?.categories || []}
                onAssignmentChange={handleAssignmentChange}
                onRefresh={fetchAllBudgetData}
                currentPeriodStart={periodStartDate}
            />
        )}
      </div>
    </>
  );
};

export default BudgetView;