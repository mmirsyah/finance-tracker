// src/app/(app)/reports/SpendingReportTab.tsx
// src/app/(app)/reports/SpendingReportTab.tsx
"use client";

//import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DonutChart, Legend, List, ListItem, Title, Text, Flex} from '@tremor/react';
import { formatCurrency} from '@/lib/utils';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import { Transaction } from '@/types';

// Updated type to reflect the full data from getReportData
type ReportData = {
    spendingByCategory: { category_id: number; category_name: string; total_spent: number }[];
    topTransactions: (Transaction & { category_name: string })[];
    // other properties from getReportData can be added if needed
} | null;

interface SpendingReportTabProps {
    data: ReportData;
    isLoading: boolean;
}

const valueFormatter = (number: number) => `${formatCurrency(number)}`;

export default function SpendingReportTab({ data, isLoading }: SpendingReportTabProps) {
    if (isLoading) {
        return <ReportSkeleton />;
    }

    if (!data || !data.spendingByCategory || data.spendingByCategory.length === 0) {
        return <div className="text-center py-16 text-gray-500">Tidak ada data pengeluaran untuk rentang tanggal ini.</div>;
    }

    const chartData = data.spendingByCategory.map(item => ({
        name: item.category_name || `Kategori Lain`,
        value: item.total_spent,
    }));

    const totalSpending = chartData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left side: Donut chart and category list */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribusi Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                         <DonutChart
                            data={chartData}
                            category="value"
                            index="name"
                            valueFormatter={valueFormatter}
                            className="w-full h-60"
                            colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia']}
                        />
                        <Legend
                            categories={chartData.map(c => c.name)}
                            className="max-w-xs mt-4"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Right side: Top transactions */}
            <div className="lg:col-span-3">
                <Card>
                    <CardHeader>
                        <Title>Total Pengeluaran</Title>
                        <Text className="text-3xl font-bold text-tremor-content-strong">{formatCurrency(totalSpending)}</Text>
                    </CardHeader>
                    <CardContent>
                        <Title className="mb-4">Transaksi Teratas</Title>
                        <List>
                            {data.topTransactions && data.topTransactions.map((item) => (
                                <ListItem key={item.id}>
                                    <Flex justifyContent="start" className="truncate space-x-4">
                                        <div className="truncate">
                                            <Text className="truncate font-medium text-tremor-content-strong">{item.note || "-"}</Text>
                                            <Text className="truncate">{item.category_name || 'Tanpa Kategori'}</Text>
                                        </div>
                                    </Flex>
                                    <Text className="text-right">{formatCurrency(item.amount)}</Text>
                                </ListItem>
                            ))}
                             {!data.topTransactions || data.topTransactions.length === 0 && (
                                <ListItem>Tidak ada transaksi teratas.</ListItem>
                            )}
                        </List>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
