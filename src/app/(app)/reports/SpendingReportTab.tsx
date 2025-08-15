// src/app/(app)/reports/SpendingReportTab.tsx
"use client";

import { Card, Title, DonutChart, Legend } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import { ReportData } from './ReportsView';
import SpendingOverTimeChart from './SpendingOverTimeChart';

interface Props {
    data: ReportData | null;
    startDate: string;
    endDate: string;
}

export default function SpendingReportTab({ data, startDate, endDate }: Props) {
    const spendingData = data?.spendingByCategory || [];
    const spendingColors = ["blue", "cyan", "indigo", "violet", "fuchsia", "pink", "sky", "teal"];

    return (
        <div className="space-y-6">
            <SpendingOverTimeChart startDate={startDate} endDate={endDate} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                    <Title>Rincian Pengeluaran</Title>
                    <div className="mt-6 flex flex-col items-center justify-center gap-6">
                        <DonutChart
                            className="h-48 w-48"
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
                    <ul className="mt-4 divide-y divide-gray-200 h-80 overflow-y-auto">
                        {spendingData.length > 0 ? spendingData
                          .sort((a,b) => b.value - a.value)
                          .map((item) => (
                            <li key={item.category_id} className="py-3 px-1 flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(item.value)}
                                </p>
                            </li>
                        )) : (
                            <p className="text-center pt-16 text-gray-500">Tidak ada data.</p>
                        )}
                    </ul>
                </Card>
            </div>
        </div>
    );
}