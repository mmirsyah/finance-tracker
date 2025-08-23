// src/app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import SpendingByCategory from '@/components/dashboard/SpendingByCategory';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import OnboardingGuide from '@/components/OnboardingGuide';
import SummaryDisplay from '@/components/SummaryDisplay';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getComparisonMetrics } from '@/lib/reportService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { BudgetQuickView } from '@/components/dashboard/BudgetQuickView'; // <-- IMPORT BARU

export default function DashboardPage() {
    const { accounts, categories, assets, isLoading, householdId, profile } = useAppData();
    
    const [date, setDate] = useState<DateRange | undefined>(undefined);

    useEffect(() => {
        if (profile) {
            setDate(getCustomPeriod(profile.period_start_day || 1));
        }
    }, [profile]);

    const hasAccounts = accounts && accounts.length > 0;
    const hasCategories = categories && categories.length > 0;
    
    const { data: comparisonMetrics } = useSWR(
      (householdId && date?.from && date?.to) ? ['comparisonMetrics', householdId, date] : null,
      () => {
        if (!date?.from || !date.to) return null;
        const currentStartDate = date.from;
        const currentEndDate = date.to;
        const diff = currentEndDate.getTime() - currentStartDate.getTime();
        const previousStartDate = new Date(currentStartDate.getTime() - diff - (24 * 60 * 60 * 1000));
        const previousEndDate = new Date(currentStartDate.getTime() - (24 * 60 * 60 * 1000));
        
        return getComparisonMetrics(householdId!, currentStartDate, currentEndDate, previousStartDate, previousEndDate);
      }
    );

    if (isLoading || !date) {
        return <DashboardSkeleton />;
    }

    if (!hasAccounts || !hasCategories) {
        return <OnboardingGuide hasAccounts={hasAccounts} hasCategories={hasCategories} />;
    }

    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);
    
    const totalAvailableCash = accounts
      .filter(acc => acc.type === 'generic' && acc.name !== 'Modal Awal Aset') 
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const incomeChange = comparisonMetrics && comparisonMetrics.previous_income > 0 ? ((comparisonMetrics.current_income - comparisonMetrics.previous_income) / comparisonMetrics.previous_income) * 100 : 0;
    const spendingChange = comparisonMetrics && comparisonMetrics.previous_spending > 0 ? ((comparisonMetrics.current_spending - comparisonMetrics.previous_spending) / comparisonMetrics.previous_spending) * 100 : 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <DateRangePicker onUpdate={({ range }) => setDate(range)} initialDate={date} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryDisplay label="Total Available Cash" amount={totalAvailableCash} description="Total cash in general accounts" />
                <SummaryDisplay label="Total Asset Value" amount={totalAssetValue} description={`${assets.length} assets tracked`} />
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Income This Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(comparisonMetrics?.current_income)}</p>
                        <p className={`text-xs flex items-center ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {incomeChange > 0.1 ? <TrendingUp className="mr-1 h-4 w-4"/> : incomeChange < -0.1 ? <TrendingDown className="mr-1 h-4 w-4"/> : <Minus className="mr-1 h-4 w-4"/>}
                            {incomeChange.toFixed(1)}% vs previous period
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Spending This Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(comparisonMetrics?.current_spending)}</p>
                        <p className={`text-xs flex items-center ${spendingChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                           {spendingChange > 0.1 ? <TrendingUp className="mr-1 h-4 w-4"/> : (spendingChange < -0.1 ? <TrendingDown className="mr-1 h-4 w-4"/> : <Minus className="mr-1 h-4 w-4"/>)}
                            {spendingChange.toFixed(1)}% vs previous period
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            {/* --- PENYESUAIAN STRUKTUR GRID & PENAMBAHAN KOMPONEN BARU --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CashFlowChart dateRange={date} />
                </div>
                <div className="lg:col-span-1">
                    {/* Komponen baru ditempatkan di sini */}
                    <BudgetQuickView /> 
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentTransactions />
                </div>
                <div className="lg:col-span-1">
                    <SpendingByCategory dateRange={date} />
                </div>
            </div>

        </div>
    );
}