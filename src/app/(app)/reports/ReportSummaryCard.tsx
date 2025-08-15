// src/app/(app)/reports/ReportSummaryCard.tsx
"use client";

import { Card, Title, Text } from '@tremor/react';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ReportData } from './ReportsView';

interface Props {
    data: ReportData | null;
}

export default function ReportSummaryCard({ data }: Props) {
    if (!data) {
        return (
            <Card className="animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                </div>
            </Card>
        );
    }
    
    const { summary, topTransactions } = data;
    const netCashFlow = summary.total_income - summary.total_expense;

    return (
        <Card>
            <Title>Ringkasan Periode</Title>
            <div className="space-y-3 text-sm mt-4">
                <div className="flex justify-between">
                    <Text className="text-gray-600">Total Pemasukan</Text>
                    <Text className="font-medium text-green-600">{formatCurrency(summary.total_income)}</Text>
                </div>
                <div className="flex justify-between">
                    <Text className="text-gray-600">Total Pengeluaran</Text>
                    <Text className="font-medium text-red-600">{formatCurrency(summary.total_expense)}</Text>
                </div>
                <hr/>
                <div className="flex justify-between">
                    <Text className="text-gray-600">Arus Kas Bersih</Text>
                    <Text className={`font-bold ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netCashFlow)}</Text>
                </div>
                <hr/>
                <div className="flex justify-between">
                    <Text className="text-gray-600">Transaksi Teratas</Text>
                    <Text className="font-medium text-red-600">{formatCurrency(topTransactions?.[0]?.amount || 0)}</Text>
                </div>
                <div className="flex justify-between">
                    <Text className="text-gray-600">Jumlah Transaksi</Text>
                    <Text className="font-medium text-gray-900">{topTransactions?.length + (data.cashFlow?.filter(cf => cf.Pemasukan > 0).length || 0)}</Text>
                </div>
            </div>
            <button disabled className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed">
                <Download className="w-4 h-4" /> Download CSV
            </button>
        </Card>
    );
}