// src/app/(app)/reports/SpendingReportTab.tsx
"use client";

import { Card, Title, DonutChart, Legend } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import { ReportData } from './ReportsView';

interface Props {
    data: ReportData | null;
}

export default function SpendingReportTab({ data }: Props) {
    const spendingData = data?.spendingByCategory || [];
    const spendingColors = ["blue", "cyan", "indigo", "violet", "fuchsia", "pink", "sky", "teal"];

    return (
        <div className="space-y-6">
            <Card>
                <Title>Rincian Pengeluaran</Title>
                <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-10">
                    <DonutChart
                        className="h-72 w-72"
                        data={spendingData}
                        category="value"
                        index="name"
                        valueFormatter={formatCurrency}
                        colors={spendingColors}
                        showAnimation={true}
                        noDataText="Tidak ada data pengeluaran."
                    />
                    <Legend
                        categories={spendingData.map(item => item.name)}
                        colors={spendingColors}
                        className="max-w-xs"
                    />
                </div>
            </Card>

            <Card>
                <Title>Detail Pengeluaran per Kategori</Title>
                <ul className="mt-4 divide-y divide-gray-200">
                    {spendingData.map((item) => (
                        <li key={item.category_id} className="py-3 flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(item.value)}
                            </p>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}