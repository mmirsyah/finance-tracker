// src/components/budget/BudgetingAssistant.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetHistoryData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart } from '@tremor/react';
import { toast } from 'sonner';
import { getCategorySpendingHistory } from '@/lib/budgetService';
import { useAppData } from '@/contexts/AppDataContext';

interface BudgetingAssistantProps {
    categoryId: number;
    currentPeriodStart: Date;
    onApply: (amount: number) => void;
    onOpenChange: (open: boolean) => void;
}

export const BudgetingAssistant = ({ categoryId, onApply, currentPeriodStart, onOpenChange }: BudgetingAssistantProps) => {
    const { householdId } = useAppData();
    const [history, setHistory] = useState<BudgetHistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!householdId) return;
        
        getCategorySpendingHistory(householdId, categoryId, currentPeriodStart)
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
    }, [householdId, categoryId, currentPeriodStart]);
    
    const handleApply = (amount: number) => {
        onApply(amount);
        onOpenChange(false);
    };

    // Fungsi untuk menghitung persentase perbedaan antara pengeluaran dan anggaran
    const calculateDifference = (spent: number, budget: number) => {
        if (budget === 0) return 0;
        return ((spent - budget) / budget) * 100;
    };

    // Fungsi untuk mendapatkan indikator tren
    const getTrendIndicator = (spent: number, budget: number) => {
        const difference = calculateDifference(spent, budget);
        if (difference > 10) return <TrendingUp className="w-4 h-4 text-red-500" />;
        if (difference < -10) return <TrendingDown className="w-4 h-4 text-green-500" />;
        return <Minus className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="space-y-4 p-4 w-full max-w-md">
            <p className="text-sm font-semibold text-center border-b pb-2">Bantuan Anggaran</p>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : history && history.monthly_history.length > 0 ? (
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
                            <span className="text-gray-500">Rata-rata 3 Bln Terakhir</span>
                            <span className="font-semibold">{formatCurrency(history.three_month_avg)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Pengeluaran Bulan Lalu</span>
                            <span className="font-semibold">{formatCurrency(history.last_month_spending)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Anggaran Bulan Lalu</span>
                            <span className="font-semibold">{formatCurrency(history.last_month_budget)}</span>
                        </div>
                        {history.last_month_budget > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Perbandingan Bulan Lalu</span>
                                    {getTrendIndicator(history.last_month_spending, history.last_month_budget)}
                                </div>
                                <span className={`font-semibold ${
                                    calculateDifference(history.last_month_spending, history.last_month_budget) > 10 
                                        ? 'text-red-500' 
                                        : calculateDifference(history.last_month_spending, history.last_month_budget) < -10 
                                            ? 'text-green-500' 
                                            : 'text-gray-500'
                                }`}>
                                    {calculateDifference(history.last_month_spending, history.last_month_budget) > 0 ? '+' : ''}
                                    {calculateDifference(history.last_month_spending, history.last_month_budget).toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleApply(history.last_month_spending)}>
                            Pakai Bln Lalu
                        </Button>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleApply(history.three_month_avg)}>
                            Pakai Rata-rata
                        </Button>
                        {history.last_month_budget > 0 && (
                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleApply(history.last_month_budget)}>
                                Pakai Anggaran
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-center text-sm text-gray-500 h-48 flex items-center justify-center">
                    Tidak ada data histori pengeluaran untuk kategori ini.
                </p>
            )}
        </div>
    );
};