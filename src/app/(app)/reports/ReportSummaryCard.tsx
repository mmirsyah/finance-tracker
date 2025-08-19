// src/app/(app)/reports/ReportSummaryCard.tsx
"use client";

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';
import useSWR from 'swr';
import { getTransactionSummary } from '@/lib/reportService';
import { useAppData } from '@/contexts/AppDataContext';
import { TransactionSummary } from '@/types';

const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };
const formatDate = (dateString: string | null | undefined) => { if (!dateString) return 'N/A'; const date = new Date(dateString); if (isNaN(date.getTime())) return 'N/A'; return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); };

const SummaryDetails = ({ summary }: { summary: TransactionSummary | null }) => {
    if (!summary) {
        return (
            <div className="space-y-3 text-sm animate-pulse">
                <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-4 bg-gray-200 rounded w-12"></div></div>
                <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-4 bg-gray-200 rounded w-20"></div></div>
                <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-28"></div><div className="h-4 bg-gray-200 rounded w-20"></div></div>
            </div>
        );
    }

    return (
        <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Total transaksi</span><span className="font-medium text-gray-900">{summary.total_transactions || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Transaksi terbesar</span><span className="font-medium text-green-600">{formatCurrency(summary.largest_transaction)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Pengeluaran terbesar</span><span className="font-medium text-red-600">{formatCurrency(summary.largest_expense)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Rata-rata transaksi</span><span className="font-medium text-gray-900">{formatCurrency(summary.average_transaction)}</span></div>
            <hr className="my-3"/>
            <div className="flex justify-between"><span className="text-gray-600">Total pemasukan</span><span className="font-medium text-green-600">{formatCurrency(summary.total_income)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total pengeluaran</span><span className="font-medium text-red-600">{formatCurrency(summary.total_spending)}</span></div>
            <hr className="my-3"/>
            <div className="flex justify-between"><span className="text-gray-600">Transaksi pertama</span><span className="font-medium text-gray-900">{formatDate(summary.first_transaction_date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Transaksi terakhir</span><span className="font-medium text-gray-900">{formatDate(summary.last_transaction_date)}</span></div>
        </div>
    );
};

// --- PERBAIKAN: Komponen ini tidak lagi menerima props ---
export default function ReportSummaryCard() {
    const { householdId } = useAppData();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const { data: summary, isLoading } = useSWR(
        (householdId && dateRange?.from && dateRange?.to) ? ['transactionSummary', householdId, dateRange] : null,
        () => getTransactionSummary(householdId!, dateRange!)
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <CardTitle>Ringkasan Transaksi</CardTitle>
                        <CardDescription>Pilih rentang tanggal untuk melihat ringkasan.</CardDescription>
                    </div>
                    <DateRangePicker onUpdate={({ range }) => setDateRange(range)} />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="text-center text-gray-500 py-10">Memuat ringkasan...</div>}
                {!isLoading && (!dateRange?.from || !dateRange.to) && <div className="text-center text-gray-500 py-10">Pilih rentang tanggal untuk memulai.</div>}
                {!isLoading && dateRange?.from && dateRange.to && (
                   <SummaryDetails summary={summary || null} />
                )}
            </CardContent>
        </Card>
    );
}