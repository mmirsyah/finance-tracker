// src/components/SummaryDisplay.tsx
"use client";

import { TransactionSummary as TSummary } from '@/types';

// Helper di dalam file agar mandiri
const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };
const formatDate = (dateString: string | null | undefined) => { if (!dateString) return 'N/A'; const date = new Date(dateString); if (isNaN(date.getTime())) return 'N/A'; return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); };

interface SummaryDisplayProps {
    summary: TSummary | null;
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
    if (!summary) {
        // Tampilan skeleton sederhana saat data null
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
}