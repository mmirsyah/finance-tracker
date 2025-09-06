'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Loader2, ArrowUpRight, ArrowDownRight, PiggyBank, Percent, Hash } from 'lucide-react';
import type { TransactionSummary as TSummary } from '@/types';
import { useAppData } from '@/contexts/AppDataContext';
import { getTransactionsForExport } from '@/lib/reportService';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransactionSummaryProps {
  startDate?: string;
  endDate?: string;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const SummaryItem = ({ icon: Icon, label, value, colorClass }: { icon: React.ElementType, label: string, value: string, colorClass?: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className={cn(
      "font-semibold text-right w-28 md:w-32 text-sm",
      colorClass || 'text-foreground'
    )}>{value}</p>
  </div>
);

export default function TransactionSummary({ startDate, endDate }: TransactionSummaryProps) {
  const [summary, setSummary] = useState<TSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { householdId, dataVersion } = useAppData();

  const fetchSummary = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    
    const p_start_date = startDate || '1970-01-01';
    const p_end_date = endDate || '2999-12-31';

    const { data, error } = await supabase.rpc('get_transaction_summary', {
      p_household_id: householdId,
      p_start_date,
      p_end_date,
    });

    if (error) {
      console.error('Error fetching summary:', error);
      toast.error("Gagal memuat ringkasan transaksi.");
    } else if (data && data.length > 0) {
      setSummary(data[0]);
    } else {
      setSummary(null); // Reset summary if no data
    }
    setLoading(false);
  }, [householdId, startDate, endDate]);

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

  const netSavings = (summary?.total_income || 0) - (summary?.total_spending || 0);
  const savingsRate = (summary?.total_income || 0) > 0 ? 
  (netSavings / (summary?.total_income || 1)) * 100 : 0;
  const averageExpense = (summary?.total_transactions || 0) > 0 ? (summary?.total_spending || 0) / (summary?.total_transactions || 1) : 0;

  if (loading) {
    return (
        <Card>
            <CardHeader><h3 className="font-semibold text-foreground">Summarize Transaction</h3></CardHeader>
            <CardContent className="space-y-4">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-5 bg-muted rounded w-1/2"></div>
                <div className="h-5 bg-muted rounded w-2/3"></div>
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-5 bg-muted rounded w-1/2"></div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-foreground">Summarize Transaction</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <SummaryItem icon={ArrowUpRight} label="Total Pemasukan" value={formatCurrency(summary.total_income)} colorClass="text-secondary-text" />
            <SummaryItem icon={ArrowDownRight} label="Total Pengeluaran" value={formatCurrency(summary.total_spending)} colorClass="text-destructive-text" />
            <SummaryItem icon={PiggyBank} label="Simpanan Bersih" value={formatCurrency(netSavings)} colorClass={netSavings >= 0 ? 'text-secondary-text' : 'text-destructive-text'} />
            <hr />
            <SummaryItem icon={Percent} label="Tingkat Tabungan" value={`${savingsRate.toFixed(1)}%`} />
            <SummaryItem icon={Hash} label="Rata-rata Pengeluaran" value={formatCurrency(averageExpense)} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada data ringkasan untuk periode ini.</p>
        )}
        <Button onClick={handleDownload} disabled={isDownloading || !startDate || !endDate} className="w-full mt-4">
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {isDownloading ? 'Memproses...' : 'Download Laporan CSV'}
        </Button>
      </CardContent>
    </Card>
  );
}
