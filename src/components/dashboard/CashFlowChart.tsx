// src/components/dashboard/CashFlowChart.tsx
"use client";

import { useAppData } from "@/contexts/AppDataContext";
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart } from "@tremor/react";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';

type CashFlowData = {
    period_start: string;
    total_income: number;
    total_expense: number;
};

// --- PERBAIKAN: Tipe kembalian fetcher diperbaiki ---
const fetcher = async ([_, householdId, dateRange]: [string, string, DateRange]): Promise<{ period_start: string; total_income: number; total_expense: number }[]> => {
    if (!dateRange.from || !dateRange.to) return [];
    
    const { data, error } = await supabase.rpc('get_dynamic_cash_flow', {
        p_household_id: householdId,
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd')
    });
    
    if (error) {
        console.error("Cash flow error:", error);
        throw new Error(error.message);
    }

    return (data as CashFlowData[]).map((item: CashFlowData) => ({
        ...item,
        period_start: format(new Date(item.period_start), 'dd MMM')
    }));
};

interface CashFlowChartProps {
    dateRange: DateRange | undefined;
}

export default function CashFlowChart({ dateRange }: CashFlowChartProps) {
    const { householdId } = useAppData();
    const { data: chartData, isLoading } = useSWR(
        (householdId && dateRange?.from && dateRange.to) ? ['cashFlow', householdId, dateRange] : null, 
        fetcher
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Arus Kas (Cash Flow)</CardTitle>
                <CardDescription>Perbandingan total pemasukan dan pengeluaran pada periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="h-72 flex items-center justify-center text-muted-foreground">Loading chart...</div>}
                {(!isLoading && (!chartData || chartData.length === 0)) && <div className="h-72 flex items-center justify-center text-muted-foreground">Tidak ada data untuk ditampilkan.</div>}
                {(!isLoading && chartData && chartData.length > 0) && (
                    <AreaChart
                        className="h-72 mt-4"
                        data={chartData}
                        index="period_start"
                        categories={['total_income', 'total_expense']}
                        colors={['green', 'red']}
                        valueFormatter={formatCurrency}
                        yAxisWidth={80}
                    />
                )}
            </CardContent>
        </Card>
    );
}