// src/app/(app)/reports/CashFlowReportTab.tsx
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// PERBAIKAN: Menghapus 'BarChart' yang tidak digunakan
import { AreaChart } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import SummaryDisplay from '@/components/SummaryDisplay';

// Tipe data yang diharapkan dari 'data' prop
type CashFlowData = {
    period: string;
    pemasukan: number;
    pengeluaran: number;
    saldo_akhir: number; // Menambahkan saldo_akhir
};

type ReportData = {
    cashFlow: CashFlowData[];
} | null;

interface CashFlowReportTabProps {
    data: ReportData;
    isLoading: boolean;
}

export default function CashFlowReportTab({ data, isLoading }: CashFlowReportTabProps) {
    const processedData = useMemo(() => {
        if (!data || !data.cashFlow || data.cashFlow.length === 0) {
            return null;
        }

        const openingBalance = data.cashFlow[0].saldo_akhir - data.cashFlow[0].pemasukan + data.cashFlow[0].pengeluaran;
        const closingBalance = data.cashFlow[data.cashFlow.length - 1].saldo_akhir;
        const totalIncome = data.cashFlow.reduce((sum, item) => sum + item.pemasukan, 0);
        const totalExpense = data.cashFlow.reduce((sum, item) => sum + item.pengeluaran, 0);
        const netCashFlow = totalIncome - totalExpense;

        const formattedChartData = data.cashFlow.map(cf => ({
            period: new Date(cf.period).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            'Pemasukan': cf.pemasukan,
            'Pengeluaran': cf.pengeluaran,
            'Total Kas': cf.saldo_akhir,
        }));
        
        return {
            openingBalance,
            closingBalance,
            totalIncome,
            totalExpense,
            netCashFlow,
            formattedChartData,
        };
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
                    <CardTitle>Grafik Arus Kas & Saldo Total</CardTitle>
                    <CardDescription>Visualisasi pergerakan dana dan saldo akhir kas Anda dari waktu ke waktu.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AreaChart
                        className="h-80"
                        data={processedData.formattedChartData}
                        index="period"
                        categories={['Pemasukan', 'Pengeluaran', 'Total Kas']}
                        colors={['emerald', 'rose', 'blue']}
                        valueFormatter={formatCurrency}
                        yAxisWidth={80}
                        showAnimation={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}