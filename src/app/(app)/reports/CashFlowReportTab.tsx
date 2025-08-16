// src/app/(app)/reports/CashFlowReportTab.tsx
"use client";

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, Metric, Text, Title, BarChart } from '@tremor/react';
import { cn, formatCurrency } from '@/lib/utils';
import { ReportData } from './ReportsView';
import FilteredTransactionList from './FilteredTransactionList';
import ReportSummaryCard from './ReportSummaryCard';
import { DateRange } from 'react-day-picker';
import { useAppData } from '@/contexts/AppDataContext';
import { getCustomPeriod } from '@/lib/periodUtils';

interface Props {
    data: ReportData | null;
}

const SummaryCard = ({ title, value, color }: { title: string, value: string | number, color?: string }) => (
    <Card>
      <Text>{title}</Text>
      <Metric className={cn(color)}>{value}</Metric>
    </Card>
);

export default function CashFlowReportTab({ data }: Props) {
    const { profile } = useAppData();

    const dateRange: DateRange = useMemo(() => {
        if (data && data.cashFlow.length > 0) {
            const firstDay = parseISO(data.cashFlow[0].period);
            const lastDay = parseISO(data.cashFlow[data.cashFlow.length - 1].period);
            return { from: firstDay, to: lastDay };
        }
        return getCustomPeriod(profile?.period_start_day || 1);
    }, [data, profile]);

    const netCashFlow = useMemo(() => {
        if (!data?.summary) return 0;
        return data.summary.total_income - data.summary.total_expense;
    }, [data]);

    const savingsRate = useMemo(() => {
        if (!data?.summary || !data.summary.total_income) return 0;
        return (netCashFlow / data.summary.total_income) * 100;
    }, [data, netCashFlow]);

    const cashFlowForChart = useMemo(() => {
        if (!data?.cashFlow) return [];
        // Mengganti nama kategori agar sesuai dengan bahasa Inggris
        return data.cashFlow.map(item => ({
            date: format(parseISO(item.period), 'd MMM'),
            Income: item.Pemasukan,
            Spending: item.Pengeluaran
        }));
    }, [data?.cashFlow]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <Title>Cash Flow Graph</Title>
                    <BarChart
                        className="mt-6 h-80"
                        data={cashFlowForChart}
                        index="date"
                        categories={["Income", "Spending"]}
                        colors={["green", "red"]}
                        valueFormatter={formatCurrency}
                        yAxisWidth={60}
                        noDataText="No data for this period."
                    />
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard title="Total Income" value={formatCurrency(data?.summary.total_income || 0)} color="text-green-600" />
                    <SummaryCard title="Total Spending" value={formatCurrency(data?.summary.total_expense || 0)} color="text-red-600" />
                    <SummaryCard title="Net Cash Flow" value={formatCurrency(netCashFlow)} color={netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"} />
                    <SummaryCard title="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color={savingsRate >= 0 ? "text-emerald-600" : "text-amber-600"} />
                </div>

                <FilteredTransactionList 
                    startDate={format(dateRange.from!, 'yyyy-MM-dd')}
                    endDate={format(dateRange.to!, 'yyyy-MM-dd')}
                />
            </div>
            <div className="lg:col-span-1">
                <ReportSummaryCard data={data} />
            </div>
        </div>
    );
}