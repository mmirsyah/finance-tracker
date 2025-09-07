// src/app/(app)/reports/ReportsView.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, subDays, differenceInDays } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import useSWR from 'swr';
import { getReportData, getTransactionSummary, getComparisonMetrics } from '@/lib/reportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/DateRangePicker';
import ReportSummaryCard from './ReportSummaryCard';
import SpendingReportTab from './SpendingReportTab';
import CashFlowReportTab from './CashFlowReportTab';
import AssetsReportTab from './AssetsReportTab';
import { getCustomPeriod } from '@/lib/periodUtils';

// Definisikan fetcher di luar komponen untuk stabilitas
const reportFetcher = (key: string[]) => {
    const [, householdId, startDate, endDate] = key;
    return getReportData(householdId, startDate, endDate);
}

const summaryFetcher = (key: string[]) => {
    const [, householdId, startDate, endDate] = key;
    return getTransactionSummary(householdId, { from: new Date(startDate), to: new Date(endDate) });
}

const comparisonFetcher = (key: string[]) => {
    const [, householdId, currentStart, currentEnd, previousStart, previousEnd] = key;
    return getComparisonMetrics(
        householdId, 
        new Date(currentStart), 
        new Date(currentEnd), 
        new Date(previousStart), 
        new Date(previousEnd)
    );
}

export default function ReportsView() {
    const { householdId, profile } = useAppData();
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    
    useEffect(() => {
        if (profile) {
            setDate(getCustomPeriod(profile.period_start_day || 1));
        }
    }, [profile]);

    const { previousDateRange, dateKey, comparisonKey } = useMemo(() => {
        if (!householdId || !date?.from || !date?.to) {
            return { previousDateRange: undefined, dateKey: null, comparisonKey: null };
        }

        const currentStartDate = date.from;
        const currentEndDate = date.to;
        const duration = differenceInDays(currentEndDate, currentStartDate);
        
        const previousStartDate = subDays(currentStartDate, duration + 1);
        const previousEndDate = subDays(currentEndDate, duration + 1);

        const formattedCurrentStart = format(currentStartDate, 'yyyy-MM-dd');
        const formattedCurrentEnd = format(currentEndDate, 'yyyy-MM-dd');
        const formattedPreviousStart = format(previousStartDate, 'yyyy-MM-dd');
        const formattedPreviousEnd = format(previousEndDate, 'yyyy-MM-dd');

        return {
            previousDateRange: { from: previousStartDate, to: previousEndDate },
            dateKey: [householdId, formattedCurrentStart, formattedCurrentEnd],
            comparisonKey: [householdId, formattedCurrentStart, formattedCurrentEnd, formattedPreviousStart, formattedPreviousEnd]
        };
    }, [date, householdId]);


    const { data: reportData, isLoading: isReportLoading } = useSWR(
        dateKey ? ['reports', ...dateKey] : null,
        reportFetcher
    );

    const { data: summaryData, isLoading: isSummaryLoading } = useSWR(
        dateKey ? ['summary', ...dateKey] : null,
        summaryFetcher
    );

    const { data: comparisonData, isLoading: isComparisonLoading } = useSWR(
        comparisonKey ? ['comparison', ...comparisonKey] : null,
        comparisonFetcher
    );


    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
                  <p className="text-sm text-muted-foreground mt-1">Analisis keuangan Anda secara detail</p>
                </div>
                <DateRangePicker onUpdate={({ range }) => setDate(range)} initialDate={date} />
            </div>

            <ReportSummaryCard 
                summary={summaryData || null}
                comparisonData={comparisonData || null}
                isLoading={isSummaryLoading || isComparisonLoading || !dateKey}
                isDateSelected={!!dateKey}
                previousPeriod={previousDateRange}
            />
            
            <Tabs defaultValue="spending">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="spending">Pengeluaran</TabsTrigger>
                    <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
                    <TabsTrigger value="assets">Aset</TabsTrigger>
                </TabsList>
                <TabsContent value="spending">
                    <SpendingReportTab 
                        data={reportData || null}
                        isLoading={isReportLoading || !dateKey}
                    />
                </TabsContent>
                <TabsContent value="cashflow">
                    <CashFlowReportTab 
                        data={reportData || null}
                        isLoading={isReportLoading || !dateKey}
                    />
                </TabsContent>
                <TabsContent value="assets">
                    <AssetsReportTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
