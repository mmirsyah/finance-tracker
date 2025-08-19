// src/app/(app)/reports/SpendingReportTab.tsx
"use client";

import { useAppData } from '@/contexts/AppDataContext'; // Import useAppData
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DonutChart, Legend } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';

type ReportData = {
    spendingByCategory: { category_id: number; total_spent: number }[];
    summary: { top_category: string; top_category_amount: number };
} | null;

interface SpendingReportTabProps {
    data: ReportData;
    isLoading: boolean;
}


export default function SpendingReportTab({ data, isLoading }: SpendingReportTabProps) {
    // --- PERBAIKAN: Ambil data kategori dari konteks ---
    const { categories } = useAppData();

    if (isLoading) {
        return <ReportSkeleton />;
    }

    if (!data || !data.spendingByCategory || data.spendingByCategory.length === 0) {
        return <div className="text-center py-16 text-gray-500">Pilih rentang tanggal untuk menampilkan laporan pengeluaran.</div>;
    }

    // --- PERBAIKAN: Petakan ID ke Nama Kategori ---
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    const chartData = data.spendingByCategory.map(item => ({
        name: categoryMap.get(item.category_id) || `Kategori #${item.category_id}`,
        value: item.total_spent,
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">
                        {formatCurrency(data.spendingByCategory.reduce((acc, curr) => acc + curr.total_spent, 0))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Kategori Teratas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">
                        {data.summary.top_category || 'N/A'}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Pengeluaran Kategori Teratas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">
                        {formatCurrency(data.summary.top_category_amount)}
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Distribusi Pengeluaran</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <DonutChart
                        data={chartData}
                        category="value"
                        index="name"
                        valueFormatter={formatCurrency}
                        className="w-full h-80"
                    />
                    {/* --- PERBAIKAN: Menggunakan nama kategori dari chartData --- */}
                    <Legend
                        categories={chartData.map(c => c.name)}
                        className="max-w-xs"
                    />
                </CardContent>
            </Card>
        </div>
    );
}