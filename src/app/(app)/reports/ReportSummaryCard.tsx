// src/app/(app)/reports/ReportSummaryCard.tsx
"use client";

import { Card, Metric, Text, Badge, Grid, Flex, Title, Subtitle } from '@tremor/react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { TransactionSummary } from '@/types';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };

// Custom Badge for Spending: Green for down, Red for up
const SpendingBadge = ({ change }: { change: number | null | undefined }) => {
    if (change === null || change === undefined || change === 0) {
        return <Badge color="gray">Tidak berubah</Badge>;
    }
    const isPositive = change < 0; // A decrease in spending is positive
    const percentage = Math.abs(change).toFixed(2);

    return (
        <Badge color={isPositive ? 'emerald' : 'red'} icon={isPositive ? ArrowDownCircle : ArrowUpCircle}>
            {percentage}%
        </Badge>
    );
};

interface ComparisonData {
    current_income: number;
    previous_income: number;
    income_change: number;
    current_spending: number;
    previous_spending: number;
    spending_change: number;
    current_net: number;
    previous_net: number;
    net_change: number;
}

interface ReportSummaryCardProps {
    summary: TransactionSummary | null;
    comparisonData: ComparisonData | null;
    isLoading: boolean;
    isDateSelected: boolean;
    previousPeriod?: DateRange;
}

const LoadingSkeleton = () => (
    <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
        {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-2/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </Card>
        ))}
    </Grid>
);

export default function ReportSummaryCard({ summary, comparisonData, isLoading, isDateSelected, previousPeriod }: ReportSummaryCardProps) {
    const formatPeriod = (period: DateRange | undefined) => {
        if (!period?.from || !period?.to) return '';
        return `${format(period.from, 'd MMM')} - ${format(period.to, 'd MMM yyyy')}`;
    }

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSkeleton />;
        }

        if (!isDateSelected || !summary || !comparisonData) {
            return <Card className="text-center text-gray-500 p-10">Pilih rentang tanggal untuk melihat ringkasan.</Card>;
        }

        // --- FIX: Calculations are now inside the block where data is guaranteed to exist ---
        const { current_income, previous_income, current_spending, previous_spending } = comparisonData;

        const incomeChange = previous_income === 0 
            ? (current_income > 0 ? 100 : 0)
            : ((current_income - previous_income) / Math.abs(previous_income)) * 100;

        const spendingChange = previous_spending === 0
            ? (current_spending > 0 ? 100 : 0)
            : ((current_spending - previous_spending) / Math.abs(previous_spending)) * 100;

        const currentNet = current_income - current_spending;
        const previousNet = previous_income - previous_spending;
        
        const netChange = previousNet === 0
            ? (currentNet > 0 ? 100 : (currentNet < 0 ? -100 : 0))
            : ((currentNet - previousNet) / Math.abs(previousNet)) * 100;

        return (
            <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
                <Card>
                    <Text>Pemasukan</Text>
                    <Flex justifyContent="start" alignItems="baseline" className="space-x-3 truncate">
                        <Metric>{formatCurrency(current_income)}</Metric>
                        <Text>dari {formatCurrency(previous_income)}</Text>
                    </Flex>
                    <Flex justifyContent="start" className="space-x-2 mt-4">
                        <Badge color={incomeChange >= 0 ? 'emerald' : 'red'} icon={incomeChange >= 0 ? ArrowUpCircle : ArrowDownCircle}>
                            {Math.abs(incomeChange).toFixed(2)}%
                        </Badge>
                        <Text>dari periode sebelumnya</Text>
                    </Flex>
                </Card>
                <Card>
                    <Text>Pengeluaran</Text>
                     <Flex justifyContent="start" alignItems="baseline" className="space-x-3 truncate">
                        <Metric>{formatCurrency(current_spending)}</Metric>
                        <Text>dari {formatCurrency(previous_spending)}</Text>
                    </Flex>
                    <Flex justifyContent="start" className="space-x-2 mt-4">
                        <SpendingBadge change={spendingChange} />
                        <Text>dari periode sebelumnya</Text>
                    </Flex>
                </Card>
                <Card>
                    <Text>Tabungan Bersih</Text>
                    <Flex justifyContent="start" alignItems="baseline" className="space-x-3 truncate">
                        <Metric>{formatCurrency(currentNet)}</Metric>
                        <Text>dari {formatCurrency(previousNet)}</Text>
                    </Flex>
                    <Flex justifyContent="start" className="space-x-2 mt-4">
                         <Badge color={netChange >= 0 ? 'emerald' : 'red'} icon={netChange >= 0 ? ArrowUpCircle : ArrowDownCircle}>
                            {Math.abs(netChange).toFixed(2)}%
                        </Badge>
                        <Text>dari periode sebelumnya</Text>
                    </Flex>
                </Card>
            </Grid>
        );
    };

    return (
        <div>
            <Flex alignItems="start" className="mb-4">
                <div>
                    <Title>Ringkasan Transaksi</Title>
                    <Subtitle>Perbandingan dengan periode sebelumnya ({formatPeriod(previousPeriod)})</Subtitle>
                </div>
            </Flex>
            {renderContent()}
        </div>
    );
}


