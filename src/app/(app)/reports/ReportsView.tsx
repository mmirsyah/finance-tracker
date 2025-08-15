// src/app/(app)/reports/ReportsView.tsx
"use client";

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAppData } from '@/contexts/AppDataContext';
import { getReportData } from '@/lib/reportService';
import { getCustomPeriod } from '@/lib/periodUtils';
import { DateRangePicker } from '@/components/DateRangePicker';
import { toast } from 'sonner';
import ReportSkeleton from '@/components/skeletons/ReportSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CashFlowReportTab from './CashFlowReportTab';
import SpendingReportTab from './SpendingReportTab';
import { TransactionSummary } from '@/types';

// --- DEFINISI TIPE DATA ---
interface SummaryMetrics {
  total_expense: number;
  total_income: number;
  top_category: string;
  top_category_amount: number;
}
interface CashFlowItem {
  period: string;
  Pemasukan: number;
  Pengeluaran: number;
  date?: string;
}
interface TopTransactionItem {
  id: string;
  date: string;
  note: string | null;
  amount: number;
  category_name: string;
  account_name: string;
}
interface SpendingByCategoryItem {
  name: string;
  value: number;
  category_id: number;
}
interface RawSpendingItem {
  category_id: number;
  total_spent: number;
}
export interface ReportData {
  summary: SummaryMetrics;
  cashFlow: CashFlowItem[];
  topTransactions: TopTransactionItem[];
  spendingByCategory: SpendingByCategoryItem[];
  detailedSummary: TransactionSummary;
}

export default function ReportsView() {
  const { householdId, profile, categories } = useAppData();
  const [date, setDate] = useState<DateRange | undefined>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && !date) {
      setDate(getCustomPeriod(profile.period_start_day || 1));
    }
  }, [profile, date]);

  useEffect(() => {
    if (householdId && date?.from && date?.to) {
      setIsLoading(true);
      const startDate = format(date.from, 'yyyy-MM-dd');
      const endDate = format(date.to, 'yyyy-MM-dd');

      getReportData(householdId, startDate, endDate)
        .then(data => {
          const spendingData = data.spendingByCategory.map((item: RawSpendingItem) => ({
              category_id: item.category_id,
              name: categories.find(c => c.id === item.category_id)?.name || 'Lainnya',
              value: item.total_spent
          }));
          
          // --- PERBAIKAN: Membangun objek baru secara eksplisit ---
          // Ini memastikan semua properti yang dibutuhkan oleh 'ReportData' ada.
          const finalData: ReportData = {
            summary: data.summary,
            cashFlow: data.cashFlow,
            topTransactions: data.topTransactions,
            detailedSummary: data.detailedSummary,
            spendingByCategory: spendingData, // Gunakan data yang sudah di-map
          };
          setReportData(finalData);
        })
        .catch(error => {
          console.error("Failed to fetch report data:", error);
          toast.error("Gagal memuat data laporan.", { description: error.message });
        })
        .finally(() => setIsLoading(false));
    }
  }, [householdId, date, categories]);


  if (isLoading || !date) {
    return <ReportSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Laporan & Analisa</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
            <TabsTrigger value="spending">Pengeluaran</TabsTrigger>
            <TabsTrigger value="income" disabled>Pemasukan</TabsTrigger>
        </TabsList>
        <TabsContent value="cashflow" className="mt-6">
            <CashFlowReportTab data={reportData} />
        </TabsContent>
        <TabsContent value="spending" className="mt-6">
            <SpendingReportTab data={reportData} />
        </TabsContent>
        <TabsContent value="income">
            {/* Placeholder untuk tab Pemasukan di masa depan */}
        </TabsContent>
      </Tabs>
    </div>
  );
}