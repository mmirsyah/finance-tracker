// src/components/budget/BudgetingAssistant.tsx
"use client";

import { useState, useEffect } from 'react';
import { BudgetHistoryData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
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

    return (
        <div className="space-y-4 p-4">
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
                <p className="text-center text-sm text-gray-500 h-48 flex items-center justify-center">
                    Tidak ada data histori pengeluaran untuk kategori ini.
                </p>
            )}
        </div>
    );
};