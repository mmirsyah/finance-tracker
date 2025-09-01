// src/app/(app)/reports/CashFlowReportTab.tsx
"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, BarChart } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import SummaryDisplay from '@/components/SummaryDisplay';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type CashFlowData = {
    period: string;
    pemasukan: number;
    pengeluaran: number;
    saldo_akhir: number;
};

type ReportData = {
    cashFlow: CashFlowData[];
} | null;

interface CashFlowReportTabProps {
    data: ReportData;
    isLoading: boolean;
}

const chartViews = {
  net: {
    title: "Grafik Arus Kas Bersih (Net Flow)",
    description: "Visualisasi surplus (hijau) atau defisit (merah) kas harian Anda."
  },
  flow: {
    title: "Grafik Pemasukan vs Pengeluaran",
    description: "Visualisasi pergerakan dana masuk dan keluar dari waktu ke waktu."
  },
  balance: {
    title: "Grafik Saldo Akhir Kas",
    description: "Visualisasi pertumbuhan total saldo kas Anda dari waktu ke waktu."
  }
};

export default function CashFlowReportTab({ data, isLoading }: CashFlowReportTabProps) {
    const [activeView, setActiveView] = useState<'net' | 'flow' | 'balance'>('net');

    const processedData = useMemo(() => {
        if (!data || !data.cashFlow || data.cashFlow.length === 0) return null;

        const openingBalance = data.cashFlow[0].saldo_akhir - data.cashFlow[0].pemasukan + data.cashFlow[0].pengeluaran;
        const closingBalance = data.cashFlow[data.cashFlow.length - 1].saldo_akhir;
        const totalIncome = data.cashFlow.reduce((sum, item) => sum + item.pemasukan, 0);
        const totalExpense = data.cashFlow.reduce((sum, item) => sum + item.pengeluaran, 0);

        const formattedChartData = data.cashFlow.map(cf => {
            const period = new Date(cf.period).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            const netFlow = cf.pemasukan - cf.pengeluaran;
            return {
                period,
                'Pemasukan': cf.pemasukan,
                'Pengeluaran': cf.pengeluaran,
                'Total Kas': cf.saldo_akhir,
                'Surplus': netFlow > 0 ? netFlow : 0,
                'Defisit': netFlow < 0 ? netFlow : 0,
            };
        });
        
        return { openingBalance, closingBalance, totalIncome, totalExpense, formattedChartData };
    }, [data]);

    if (isLoading) {
        return <ReportSkeleton />;
    }

    if (!processedData) {
        return <div className="text-center py-16 text-gray-500">Pilih rentang tanggal untuk menampilkan laporan arus kas.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryDisplay label="Saldo Awal Periode" amount={processedData.openingBalance} />
                <SummaryDisplay label="Total Pemasukan" amount={processedData.totalIncome} />
                <SummaryDisplay label="Total Pengeluaran" amount={processedData.totalExpense} />
                <SummaryDisplay label="Saldo Akhir Periode" amount={processedData.closingBalance} />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>{chartViews[activeView].title}</CardTitle>
                            <CardDescription>{chartViews[activeView].description}</CardDescription>
                        </div>
                        <ToggleGroup type="single" value={activeView} onValueChange={(value: 'net' | 'flow' | 'balance') => value && setActiveView(value)} className="w-full sm:w-auto">
                            <ToggleGroupItem value="net" aria-label="Toggle Net Flow">Net Flow</ToggleGroupItem>
                            <ToggleGroupItem value="flow" aria-label="Toggle Arus Kas">Arus Kas</ToggleGroupItem>
                            <ToggleGroupItem value="balance" aria-label="Toggle Saldo">Saldo</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </CardHeader>
                <CardContent>
                    {activeView === 'net' && (
                        <BarChart
                            className="h-80"
                            data={processedData.formattedChartData}
                            index="period"
                            categories={['Surplus', 'Defisit']}
                            colors={['secondary', 'destructive']}
                            valueFormatter={formatCurrency}
                            yAxisWidth={80}
                            showAnimation={true}
                            stack={true}
                        />
                    )}
                    {activeView === 'flow' && (
                        <AreaChart
                            className="h-80"
                            data={processedData.formattedChartData}
                            index="period"
                            categories={['Pemasukan', 'Pengeluaran']}
                            colors={['secondary', 'destructive']}
                            valueFormatter={formatCurrency}
                            yAxisWidth={80}
                            showAnimation={true}
                        />
                    )}
                    {activeView === 'balance' && (
                         <AreaChart
                            className="h-80"
                            data={processedData.formattedChartData}
                            index="period"
                            categories={['Total Kas']}
                            colors={['blue']}
                            valueFormatter={formatCurrency}
                            yAxisWidth={80}
                            showAnimation={true}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
