// src/app/(app)/budgets/BudgetView.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from 'sonner';
import { getBudgetDataForPeriod, getReadyToAssign, saveBudgetAssignment } from '@/lib/budgetService';
import { BudgetPageData, BudgetParentCategoryData, BudgetCategoryData } from '@/types';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { Loader2, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { BudgetHeader } from '@/components/budget/BudgetHeader';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { BudgetPeriodNavigator } from '@/components/budget/BudgetPeriodNavigator';
import { getCustomPeriod } from '@/lib/periodUtils';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const ReadyToAssignCard = ({ isLoading, amount }: { isLoading: boolean, amount: number | null }) => {
    if (isLoading || amount === null) {
        return (
            <Card className="w-full md:w-auto">
                <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold text-center text-gray-600">Ready to Assign</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="h-9 w-40 bg-gray-200 rounded-md animate-pulse mt-1 mx-auto"></div>
                </CardContent>
            </Card>
        )
    }

    if (amount > 0) {
        return (
            <Card className="w-full md:w-auto bg-green-50 border-green-200 shadow-md">
                 <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                    <Wallet className="w-5 h-5 text-green-700"/>
                    <CardTitle className="text-sm font-semibold text-green-800">Dana Perlu Dialokasikan</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-center">
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(amount)}</p>
                    <p className="text-xs text-green-700/80 mt-1">Ayo beri setiap rupiah tugas!</p>
                </CardContent>
            </Card>
        )
    }

    if (amount < 0) {
        return (
            <Card className="w-full md:w-auto bg-red-50 border-red-200 shadow-md">
                <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                    <AlertTriangle className="w-5 h-5 text-red-700"/>
                    <CardTitle className="text-sm font-semibold text-red-800">Anggaran Melebihi Dana</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-center">
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(amount)}</p>
                    <p className="text-xs text-red-700/80 mt-1">Kurangi alokasi di salah satu kategori.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full md:w-auto bg-blue-50 border-blue-200 shadow-md">
            <CardHeader className="p-3 flex-row items-center gap-2 space-y-0">
                <CheckCircle2 className="w-5 h-5 text-blue-700"/>
                <CardTitle className="text-sm font-semibold text-blue-800">Kerja Bagus!</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-center">
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(0)}</p>
                <p className="text-xs text-blue-700/80 mt-1">Semua dana telah dialokasikan.</p>
            </CardContent>
        </Card>
    );
};


const BudgetView = () => {
  const { householdId, dataVersion, profile, isLoading: isAppDataLoading } = useAppData();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetPageData | null>(null);
  const [readyToAssign, setReadyToAssign] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && !currentDate) {
      setCurrentDate(new Date('2025-07-15'));
    }
  }, [profile, currentDate]);

  const { periodStartDate, periodEndDate, periodDisplayText } = useMemo(() => {
    if (!profile || !currentDate) {
      return { 
        periodStartDate: new Date(), 
        periodEndDate: new Date(), 
        periodDisplayText: 'Memuat...' 
      };
    }
    const startDay = profile.period_start_day || 1;
    const period = getCustomPeriod(startDay, currentDate);
    const displayText = `${format(period.from, 'd MMM', { locale: indonesiaLocale })} - ${format(period.to, 'd MMM yyyy', { locale: indonesiaLocale })}`;
    return { periodStartDate: period.from, periodEndDate: period.to, periodDisplayText: displayText };
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
    fetchAllBudgetData();
  }, [fetchAllBudgetData, dataVersion]);

  const handlePeriodChange = (direction: 'next' | 'prev') => {
    if (!currentDate) return;
    const newDate = direction === 'next' ? addMonths(periodStartDate, 1) : subMonths(periodStartDate, 1);
    setCurrentDate(newDate);
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
            if (isParentCategory(cat) && cat.children.length > 0) {
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
            // --- PERBAIKAN DI SINI ---
            total_budgeted: (prev.total_budgeted || 0) + totalAssignedChange,
        }
    });
    setReadyToAssign(prev => prev !== null ? prev - totalAssignedChange : null);

    try {
      await saveBudgetAssignment({
        household_id: householdId,
        category_id: categoryId,
        month: format(startOfMonth(periodStartDate), 'yyyy-MM-dd'),
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
    return (<div className="flex flex-col items-center justify-center h-full p-10"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" /><p className="text-muted-foreground">Memuat data aplikasi...</p></div>);
  }

  const remainingBudgetForPeriod = (budgetData?.total_budgeted ?? 0) - (budgetData?.total_activity ?? 0);

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Anggaran</h1>
                <p className="text-muted-foreground">Alokasikan dana Anda untuk setiap kategori pengeluaran.</p>
            </div>
            <ReadyToAssignCard isLoading={isLoading} amount={readyToAssign} />
            <BudgetPeriodNavigator 
                periodText={periodDisplayText}
                onPrev={() => handlePeriodChange('prev')}
                onNext={() => handlePeriodChange('next')}
            />
        </div>

        <BudgetHeader 
            totalIncome={budgetData?.total_income ?? 0}
            totalBudgeted={budgetData?.total_budgeted ?? 0}
            totalActivity={budgetData?.total_activity ?? 0}
            remainingBudget={remainingBudgetForPeriod} 
            isLoading={isLoading}
        />

        {isLoading ? (
             <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm border"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
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