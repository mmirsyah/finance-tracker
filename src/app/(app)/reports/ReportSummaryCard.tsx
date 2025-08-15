// src/app/(app)/reports/ReportSummaryCard.tsx
"use client";

import { useState, useMemo } from 'react';
import { Card, Title } from '@tremor/react';
import { Download, Loader2 } from 'lucide-react';
import { ReportData } from './ReportsView';
import { useAppData } from '@/contexts/AppDataContext';
import { getTransactionsForExport } from '@/lib/reportService';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';
import SummaryDisplay from '@/components/SummaryDisplay'; // <-- IMPORT BARU

interface Props {
    data: ReportData | null;
}

export default function ReportSummaryCard({ data }: Props) {
    const { householdId } = useAppData();
    const [isDownloading, setIsDownloading] = useState(false);

    const dateRange = useMemo(() => {
        if (data && data.cashFlow.length > 0) {
            const firstDay = parseISO(data.cashFlow[0].period);
            const lastDay = parseISO(data.cashFlow[data.cashFlow.length - 1].period);
            return { from: firstDay, to: lastDay };
        }
        return null;
    }, [data]);

    const handleDownload = async () => {
        if (!householdId || !dateRange?.from || !dateRange?.to) {
            toast.error("Tidak dapat mengekspor: Rentang tanggal tidak valid.");
            return;
        }
        setIsDownloading(true);
        toast.info("Mempersiapkan data untuk diunduh...");
        try {
            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');
            const transactionsToExport = await getTransactionsForExport(householdId, startDate, endDate);
            if (!transactionsToExport || transactionsToExport.length === 0) {
                toast.warning("Tidak ada transaksi untuk diekspor pada periode ini.");
                return;
            }
            const csv = Papa.unparse(transactionsToExport, { header: true, columns: ['tanggal', 'jenis', 'jumlah', 'kategori', 'akun_sumber', 'akun_tujuan', 'catatan'] });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `transaksi_${startDate}_hingga_${endDate}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Unduhan CSV berhasil dimulai!");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";
            toast.error(`Gagal mengunduh: ${errorMessage}`);
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <Card>
            <Title>Ringkasan Periode</Title>
            <div className="mt-4">
                {/* --- PERUBAHAN UTAMA DI SINI --- */}
                <SummaryDisplay summary={data?.detailedSummary || null} />
            </div>
            <button 
                onClick={handleDownload}
                disabled={isDownloading} 
                className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloading ? 'Memproses...' : 'Download CSV'}
            </button>
        </Card>
    );
}