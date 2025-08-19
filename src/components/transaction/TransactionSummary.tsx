// src/components/transaction/TransactionSummary.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Loader2 } from 'lucide-react';
import type { TransactionSummary as TSummary } from '@/types';
import { useAppData } from '@/contexts/AppDataContext';
import { getTransactionsForExport } from '@/lib/reportService';
import { toast } from 'sonner';
import Papa from 'papaparse';

// --- HELPER DIPINDAHKAN KE SINI AGAR KOMPONEN MANDIRI ---
const formatCurrency = (value: number | null | undefined) => { if (value === null || value === undefined) return 'Rp 0'; return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); };


interface SummaryProps {
  startDate: string;
  endDate: string;
}

export default function TransactionSummary({ startDate, endDate }: SummaryProps) {
  const [summary, setSummary] = useState<TSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { householdId, dataVersion } = useAppData();

  const fetchSummary = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_transaction_summary', {
      p_household_id: householdId,
      p_start_date: '1970-01-01',
      p_end_date: '2999-12-31',
    });
    if (error) {
      console.error('Error fetching summary:', error);
      toast.error("Gagal memuat ringkasan transaksi seumur hidup.");
    } else if (data && data.length > 0) {
      setSummary(data[0]);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    if (householdId) {
      fetchSummary();
    }
  }, [householdId, dataVersion, fetchSummary]);

  const handleDownload = async () => {
    if (!householdId || !startDate || !endDate) {
        toast.error("Tidak dapat mengekspor: Filter tanggal tidak valid.");
        return;
    }
    setIsDownloading(true);
    toast.info("Mempersiapkan data untuk diunduh...");
    try {
        const transactionsToExport = await getTransactionsForExport(householdId, startDate, endDate);
        if (!transactionsToExport || transactionsToExport.length === 0) {
            toast.warning("Tidak ada transaksi untuk diekspor pada filter ini.");
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Lifetime Summary</h2>

      {/* --- PERBAIKAN: Tampilkan data langsung di sini --- */}
      {loading ? (
        <div className="space-y-3 text-sm animate-pulse">
            <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-4 bg-gray-200 rounded w-12"></div></div>
            <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-4 bg-gray-200 rounded w-20"></div></div>
            <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-28"></div><div className="h-4 bg-gray-200 rounded w-20"></div></div>
        </div>
      ) : summary ? (
        <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Total pemasukan</span><span className="font-medium text-green-600">{formatCurrency(summary.total_income)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total pengeluaran</span><span className="font-medium text-red-600">{formatCurrency(summary.total_spending)}</span></div>
            <hr className="my-3"/>
            <div className="flex justify-between"><span className="text-gray-600">Total transaksi</span><span className="font-medium text-gray-900">{summary.total_transactions || 0}</span></div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Tidak ada data ringkasan.</p>
      )}

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isDownloading ? 'Memproses...' : 'Download (Sesuai Filter)'}
      </button>
    </div>
  );
}