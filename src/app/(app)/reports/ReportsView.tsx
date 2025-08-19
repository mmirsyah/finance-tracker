// src/app/(app)/reports/ReportsView.tsx
"use client";

import { useState, useEffect } from 'react'; // <-- Import useEffect
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import useSWR from 'swr';
import { getReportData } from '@/lib/reportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/DateRangePicker';
import ReportSummaryCard from './ReportSummaryCard';
import SpendingReportTab from './SpendingReportTab';
import CashFlowReportTab from './CashFlowReportTab';
import AssetsReportTab from './AssetsReportTab';
import { getCustomPeriod } from '@/lib/periodUtils'; // <-- Import baru

export default function ReportsView() {
    const { householdId, profile } = useAppData(); // <-- Ambil profile

    // --- PERBAIKAN: Menggunakan state & effect untuk sinkronisasi tanggal ---
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    
    useEffect(() => {
        if (profile) {
            setDate(getCustomPeriod(profile.period_start_day || 1));
        }
    }, [profile]);
    // --- AKHIR PERBAIKAN ---

    const { data: reportData, isLoading } = useSWR(
        (householdId && date?.from && date?.to) ? ['reports', householdId, date] : null,
        () => getReportData(householdId!, format(date!.from!, 'yyyy-MM-dd'), format(date!.to!, 'yyyy-MM-dd'))
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold">Laporan Keuangan</h1>
                <DateRangePicker onUpdate={({ range }) => setDate(range)} initialDate={date} />
            </div>

            <ReportSummaryCard />
            
            <Tabs defaultValue="spending">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="spending">Pengeluaran</TabsTrigger>
                    <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
                    <TabsTrigger value="assets">Aset</TabsTrigger>
                </TabsList>
                <TabsContent value="spending">
                    <SpendingReportTab 
                        data={reportData || null}
                        isLoading={isLoading}
                    />
                </TabsContent>
                <TabsContent value="cashflow">
                    <CashFlowReportTab 
                        data={reportData || null}
                        isLoading={isLoading}
                    />
                </TabsContent>
                <TabsContent value="assets">
                    <AssetsReportTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}