// src/app/(app)/reports/SpendingOverTimeChart.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, Title, BarChart } from '@tremor/react';
import { formatCurrency } from '@/lib/utils';
import { useAppData } from '@/contexts/AppDataContext';
import { supabase } from '@/lib/supabase';
import { format, parse } from 'date-fns';

interface Props {
  startDate: string;
  endDate: string;
}

// Tipe data untuk hasil RPC baru kita
type RpcResult = {
  period: string; // 'YYYY-MM'
  spending_details: { category: string; value: number }[];
};

const ChartSkeleton = () => (
    <Card>
        <div className="h-6 w-1/2 bg-gray-200 rounded mb-6 animate-pulse"></div>
        <div className="h-72 bg-gray-200 rounded animate-pulse"></div>
    </Card>
);

export default function SpendingOverTimeChart({ startDate, endDate }: Props) {
    const { householdId } = useAppData();
    const [rawData, setRawData] = useState<RpcResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!householdId) return;

        const fetchChartData = async () => {
            setIsLoading(true);
            // Panggil RPC baru yang mengembalikan JSON
            const { data, error } = await supabase.rpc('get_spending_over_time_by_category', {
                p_household_id: householdId,
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (error) {
                console.error("Error fetching spending over time:", error);
                setRawData([]);
            } else {
                setRawData(data || []);
            }
            setIsLoading(false);
        };

        fetchChartData();
    }, [householdId, startDate, endDate]);

    // Memoized transformation: proses data hanya jika rawData berubah
    const { chartData, categoryKeys } = useMemo(() => {
        if (rawData.length === 0) {
            return { chartData: [], categoryKeys: [] };
        }

        // 1. Kumpulkan semua nama kategori unik dari seluruh periode
        const allCategories = new Set<string>();
        rawData.forEach(period => {
            period.spending_details.forEach(detail => {
                allCategories.add(detail.category);
            });
        });
        const keys = Array.from(allCategories);

        // 2. Transformasi data ke format yang dimengerti Tremor BarChart
        const transformedData = rawData.map(period => {
            const periodObject: { [key: string]: string | number } = {
                // Format periode agar lebih mudah dibaca di chart
                period: format(parse(period.period, 'yyyy-MM', new Date()), 'MMM yyyy')
            };

            // Untuk setiap kategori yang ada, isi nilainya. Jika tidak ada, isi 0.
            keys.forEach(key => {
                const categoryData = period.spending_details.find(d => d.category === key);
                periodObject[key] = categoryData ? categoryData.value : 0;
            });

            return periodObject;
        });

        return { chartData: transformedData, categoryKeys: keys };

    }, [rawData]);
    
    if (isLoading) return <ChartSkeleton />;
    
    return (
        <Card>
            <Title>Spending Over Time by Category</Title>
            <BarChart
                className="mt-6 h-72"
                data={chartData}
                index="period"
                categories={categoryKeys} // Gunakan kategori dinamis yang kita temukan
                colors={["blue", "cyan", "indigo", "violet", "fuchsia", "pink", "sky", "teal", "amber", "rose"]}
                valueFormatter={formatCurrency}
                stack={true}
                yAxisWidth={60}
                noDataText="No spending data for this period."
            />
        </Card>
    );
}