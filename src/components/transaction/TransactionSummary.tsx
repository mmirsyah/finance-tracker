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
import SummaryDisplay from '@/components/SummaryDisplay';

interface SummaryProps {
  startDate: string;
  endDate: string;
}

export default function TransactionSummary({ startDate, endDate }: SummaryProps) {
  const [summary, setSummary] = useState<TSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { householdId, dataVersion } = useAppData(); // Ambil dataVersion dari context

  // fetchSummary sekarang akan dipicu oleh perubahan dataVersion
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
    } else if (data && data.length > 0) {
      setSummary(data[0]);
    }
    setLoading(false);
  }, [householdId]);

  // Hapus listener realtime lokal, ganti dengan dependency pada dataVersion
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

  if (loading) { return (<div className="bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 text-gray-800">Summary</h2><div className="text-center text-gray-500">Loading summary...</div></div>); }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Lifetime Summary</h2>

      <SummaryDisplay summary={summary} />

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