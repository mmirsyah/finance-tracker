// src/components/dashboard/SpendingByCategory.tsx
"use client";

import { Card, Title, DonutChart, Text, Legend } from '@tremor/react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface SpendingDataPoint {
    id: number;
    name: string;
    value: number;
}

// --- PERBAIKAN UTAMA DI SINI ---
// Hapus index signature [key: string]: any; karena tidak dibutuhkan
interface ChartClickPayload {
    id: number;
}

interface Props {
    data: SpendingDataPoint[];
}

export default function SpendingByCategory({ data }: Props) {
    const router = useRouter();

    const handleChartClick = (payload: ChartClickPayload) => {
        // Karena kita sudah tahu payload memiliki 'id', kita bisa langsung pakai
        if (payload && payload.id) {
            router.push(`/categories/${payload.id}`);
        }
    };

    const totalSpending = useMemo(() => data.reduce((acc, item) => acc + item.value, 0), [data]);
    const categoryNames = data.map(item => item.name);
    const spendingColors = ['blue', 'cyan', 'indigo', 'violet', 'fuchsia', 'pink'];

    return (
        <Card className="flex flex-col h-full">
            <Title>Spending by Category</Title>
            {data.length > 0 ? (
                <div className="flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-6 mt-4">
                    <div className="relative flex items-center justify-center">
                        <DonutChart
                            className="h-48 w-48 sm:h-64 sm:w-64 cursor-pointer"
                            data={data}
                            category="value"
                            index="name"
                            variant="donut"
                            valueFormatter={formatCurrency}
                            onValueChange={(payload) => handleChartClick(payload)}
                            showAnimation={true}
                            showLabel={false}
                            customTooltip={(props) => {
                                const { payload, active } = props;
                                if (!active || !payload) return null;
                                const categoryPayload = payload[0];
                                if (!categoryPayload) return null;
                                return (
                                    <div className="w-56 rounded-tremor-default border bg-tremor-background p-2 text-tremor-default shadow-tremor-dropdown">
                                        <div className="flex flex-1 space-x-2.5">
                                            <div className={`w-1.5 flex flex-col bg-${categoryPayload.color}-500 rounded`} />
                                            <div className="w-full">
                                                <p className="font-medium text-tremor-content-strong">{categoryPayload.name}</p>
                                                <p className="text-tremor-content">{formatCurrency(categoryPayload.value as number)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <Text className="text-center">
                                <span className="text-2xl font-bold text-gray-800">{formatCurrency(totalSpending)}</span>
                                <br />
                                <span className="text-xs text-muted-foreground">Total Spending</span>
                            </Text>
                        </div>
                    </div>
                    <Legend
                        categories={categoryNames}
                        colors={spendingColors}
                        className="max-w-xs"
                    />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <Text className="text-center text-gray-500">
                        No spending data for this period.
                    </Text>
                </div>
            )}
        </Card>
    );
}