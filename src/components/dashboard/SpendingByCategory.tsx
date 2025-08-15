// src/components/dashboard/SpendingByCategory.tsx
"use client";

import { Card, Title, BarList, Text } from '@tremor/react';
import { SpendingItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
    data: SpendingItem[];
}

export default function SpendingByCategory({ data }: Props) {
    const spendingColors = ["blue", "cyan", "indigo", "violet", "fuchsia"];

    // Mengambil 5 kategori teratas untuk ditampilkan
    const top5Data = data
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((item, index) => ({
            ...item,
            color: spendingColors[index % spendingColors.length]
        }));

    return (
        <Card>
            <Title>Spending by Category</Title>
            {top5Data.length > 0 ? (
                <BarList 
                    data={top5Data} 
                    className="mt-4" 
                    valueFormatter={formatCurrency}
                />
            ) : (
                <Text className="text-center pt-8 pb-4 text-gray-500">
                    No spending data for this period.
                </Text>
            )}
        </Card>
    );
}